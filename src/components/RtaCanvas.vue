<template>
  <div class="rta-container" ref="containerRef">
    <canvas 
      ref="canvasRef" 
      class="rta-canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
    />
    
    <div v-if="!audioStore.isStarted" class="start-overlay">
      <button @click="startAudio" class="start-button" :disabled="starting">
        {{ starting ? 'Starting...' : 'Start Audio' }}
      </button>
      <p class="instruction">Tap to start microphone and audio processing</p>
      <p class="headphones-warning">⚠️ Use headphones to prevent feedback</p>
    </div>
    
    <div v-if="audioStore.errorMessage" class="error-overlay">
      <div class="error-message">{{ audioStore.errorMessage }}</div>
      <button @click="audioStore.clearError" class="error-dismiss">Dismiss</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAudioGraph } from '@/composables/useAudioGraph'
import { useAudioStore } from '@/stores/audioStore'
import { makeLogBands, aggregateBands, frequencyToLogX, logXToFrequency } from '@/utils/logBands'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const audioStore = useAudioStore()
const { analyser, sampleRate, start, setHpfCutoff, setLpfCutoff } = useAudioGraph()

const bands = makeLogBands(20, 20000, 120)
const starting = ref(false)
let animationId = 0
let freqData: Float32Array | null = null

// Drag state
let isDragging = false
let dragType: 'hpf' | 'lpf' | null = null
const HANDLE_WIDTH = 20 // pixels

async function startAudio() {
  starting.value = true
  try {
    await start()
  } finally {
    starting.value = false
  }
}

function setupCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const dpr = Math.max(1, window.devicePixelRatio || 1)
  const rect = container.getBoundingClientRect()
  
  canvas.width = Math.floor(rect.width * dpr)
  canvas.height = Math.floor(rect.height * dpr)
  
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`
  
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const rect = canvas.getBoundingClientRect()
  const width = rect.width
  const height = rect.height
  
  // Clear canvas
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)
  
  // Draw RTA if audio is running
  if (audioStore.isStarted && analyser.value) {
    const analyserNode = analyser.value
    
    if (!freqData || freqData.length !== analyserNode.frequencyBinCount) {
      freqData = new Float32Array(analyserNode.frequencyBinCount)
    }
    
    analyserNode.getFloatFrequencyData(freqData)
    const aggregated = aggregateBands(freqData, sampleRate.value, analyserNode.fftSize, bands, 'mean')
    
    // Draw RTA bars
    const barWidth = width / aggregated.length
    ctx.fillStyle = '#39c4ff'
    
    for (let i = 0; i < aggregated.length; i++) {
      const dbValue = aggregated[i] // -100 to 0 dB
      const normalizedValue = (dbValue + 100) / 100 // 0 to 1
      const barHeight = Math.max(1, normalizedValue * height * 0.9)
      
      const x = i * barWidth
      const y = height - barHeight
      
      // Color coding: blue for normal, green for high levels
      const intensity = normalizedValue
      if (intensity > 0.8) {
        ctx.fillStyle = '#00ff00' // Green for high levels
      } else if (intensity > 0.6) {
        ctx.fillStyle = '#ffff00' // Yellow for medium-high levels
      } else {
        ctx.fillStyle = '#39c4ff' // Blue for normal levels
      }
      
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
    }
  }
  
  // Draw filter overlay
  drawFilterOverlay(ctx, width, height)
  
  // Continue animation
  animationId = requestAnimationFrame(draw)
}

function drawFilterOverlay(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const hpfX = frequencyToLogX(audioStore.hpfCutoff, 20, 20000, width)
  const lpfX = frequencyToLogX(audioStore.lpfCutoff, 20, 20000, width)
  
  // Draw filtered-out areas
  ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'
  ctx.fillRect(0, 0, hpfX, height) // Below HPF
  ctx.fillRect(lpfX, 0, width - lpfX, height) // Above LPF
  
  // Draw filter lines
  ctx.strokeStyle = '#ff4444'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])
  
  // HPF line
  ctx.beginPath()
  ctx.moveTo(hpfX, 0)
  ctx.lineTo(hpfX, height)
  ctx.stroke()
  
  // LPF line
  ctx.beginPath()
  ctx.moveTo(lpfX, 0)
  ctx.lineTo(lpfX, height)
  ctx.stroke()
  
  ctx.setLineDash([])
  
  // Draw frequency labels
  ctx.fillStyle = '#ffffff'
  ctx.font = '12px monospace'
  ctx.textAlign = 'center'
  
  const hpfLabel = `${Math.round(audioStore.hpfCutoff)}Hz`
  const lpfLabel = `${Math.round(audioStore.lpfCutoff)}Hz`
  
  ctx.fillText(hpfLabel, hpfX, height - 10)
  ctx.fillText(lpfLabel, lpfX, height - 10)
  
  // Draw draggable handles
  ctx.fillStyle = '#ff4444'
  const handleHeight = 30
  const handleY = height / 2 - handleHeight / 2
  
  // HPF handle
  ctx.fillRect(hpfX - HANDLE_WIDTH/2, handleY, HANDLE_WIDTH, handleHeight)
  
  // LPF handle
  ctx.fillRect(lpfX - HANDLE_WIDTH/2, handleY, HANDLE_WIDTH, handleHeight)
}

function onPointerDown(event: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const width = rect.width
  
  const hpfX = frequencyToLogX(audioStore.hpfCutoff, 20, 20000, width)
  const lpfX = frequencyToLogX(audioStore.lpfCutoff, 20, 20000, width)
  
  // Check if clicking on HPF handle
  if (Math.abs(x - hpfX) <= HANDLE_WIDTH / 2) {
    isDragging = true
    dragType = 'hpf'
    canvas.setPointerCapture(event.pointerId)
  }
  // Check if clicking on LPF handle
  else if (Math.abs(x - lpfX) <= HANDLE_WIDTH / 2) {
    isDragging = true
    dragType = 'lpf'
    canvas.setPointerCapture(event.pointerId)
  }
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging || !dragType) return
  
  const canvas = canvasRef.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
  const frequency = logXToFrequency(x, 20, 20000, rect.width)
  
  if (dragType === 'hpf') {
    setHpfCutoff(frequency)
  } else if (dragType === 'lpf') {
    setLpfCutoff(frequency)
  }
}

function onPointerUp(event: PointerEvent) {
  if (isDragging) {
    isDragging = false
    dragType = null
    const canvas = canvasRef.value
    if (canvas) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }
}

function handleResize() {
  setupCanvas()
}

onMounted(() => {
  nextTick(() => {
    setupCanvas()
    animationId = requestAnimationFrame(draw)
    window.addEventListener('resize', handleResize)
  })
})

onBeforeUnmount(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.rta-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #000;
  overflow: hidden;
}

.rta-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.start-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 10;
}

.start-button {
  padding: 20px 40px;
  font-size: 18px;
  font-weight: bold;
  color: white;
  background: linear-gradient(45deg, #39c4ff, #0084ff);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 20px;
}

.start-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 8px 25px rgba(57, 196, 255, 0.3);
}

.start-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.instruction {
  color: #ccc;
  font-size: 16px;
  margin: 10px 0;
}

.headphones-warning {
  color: #ff9800;
  font-size: 14px;
  font-weight: bold;
}

.error-overlay {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 0, 0, 0.9);
  color: white;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  z-index: 20;
  max-width: 80%;
}

.error-message {
  margin-bottom: 10px;
}

.error-dismiss {
  background: transparent;
  color: white;
  border: 1px solid white;
  padding: 5px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.error-dismiss:hover {
  background: white;
  color: red;
}
</style>