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
    
    <div v-if="audioStore.isStarted" class="mode-indicator">
      {{ audioStore.getEffectiveChannelMode().toUpperCase() }}
      <span v-if="audioStore.inputChannelCount > 1" class="channel-status">
        (L: {{ audioStore.activeChannels.left ? '✓' : '✗' }} 
         R: {{ audioStore.activeChannels.right ? '✓' : '✗' }})
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAudioGraph } from '@/composables/useAudioGraph'
import { useAudioStore } from '@/stores/audioStore'
import { useSilenceDetector } from '@/composables/useSilenceDetector'
import { makeLogBands, aggregateBands, frequencyToLogX, logXToFrequency } from '@/utils/logBands'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const audioStore = useAudioStore()
const { analyserLeftInput, analyserRightInput, analyserLeftOutput, analyserRightOutput, sampleRate, start, setHpfCutoff, setLpfCutoff, updateAudioRouting, setBoost } = useAudioGraph()
const silenceDetector = useSilenceDetector()

const bands = makeLogBands(20, 20000, 120)
const starting = ref(false)
let animationId = 0
let leftFreqData: Float32Array | null = null
let rightFreqData: Float32Array | null = null

// Hover/touch tooltip state
const hoverPosition = ref<{x: number, y: number} | null>(null)
const hoverInfo = ref<{frequency: number, db: number, channel?: 'L' | 'R'} | null>(null)
let lastAggregatedLeft: Float32Array | null = null
let lastAggregatedRight: Float32Array | null = null
let lastAggregatedMono: Float32Array | null = null

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
  if (audioStore.isStarted && (analyserLeftInput.value || analyserRightInput.value)) {
    // Select analyzers based on RTA mode
    const leftAnalyser = audioStore.rtaMode === 'input' ? analyserLeftInput.value : analyserLeftOutput.value
    const rightAnalyser = audioStore.rtaMode === 'input' ? analyserRightInput.value : analyserRightOutput.value
    
    // Get frequency data from both channels
    if (leftAnalyser) {
      if (!leftFreqData || leftFreqData.length !== leftAnalyser.frequencyBinCount) {
        leftFreqData = new Float32Array(leftAnalyser.frequencyBinCount)
      }
      leftAnalyser.getFloatFrequencyData(leftFreqData)
      
      // Apply boost compensation if showing output mode and boost is enabled
      if (audioStore.rtaMode === 'output' && audioStore.boostEnabled) {
        for (let i = 0; i < leftFreqData.length; i++) {
          leftFreqData[i] += 20 // Add 20dB
        }
      }
    }
    
    if (rightAnalyser) {
      if (!rightFreqData || rightFreqData.length !== rightAnalyser.frequencyBinCount) {
        rightFreqData = new Float32Array(rightAnalyser.frequencyBinCount)
      }
      rightAnalyser.getFloatFrequencyData(rightFreqData)
      
      // Apply boost compensation if showing output mode and boost is enabled
      if (audioStore.rtaMode === 'output' && audioStore.boostEnabled) {
        for (let i = 0; i < rightFreqData.length; i++) {
          rightFreqData[i] += 20 // Add 20dB
        }
      }
    }
    
    // Update silence detection
    const activeChannels = silenceDetector.updateSilenceDetection(leftFreqData, rightFreqData)
    const previousChannels = { ...audioStore.activeChannels }
    audioStore.setActiveChannels(activeChannels)
    
    // Update audio routing if channels changed
    if (previousChannels.left !== activeChannels.left || previousChannels.right !== activeChannels.right) {
      updateAudioRouting(activeChannels)
    }
    
    const effectiveMode = audioStore.getEffectiveChannelMode()
    
    if (effectiveMode === 'stereo' && activeChannels.left && activeChannels.right) {
      // Draw stereo RTA (split screen)
      drawStereoRTA(ctx, width, height, leftFreqData!, rightFreqData!)
    } else {
      // Draw mono RTA (single channel)
      const monoData = activeChannels.left ? leftFreqData : rightFreqData
      if (monoData) {
        drawMonoRTA(ctx, width, height, monoData)
      }
    }
  }
  
  // Draw filter overlay
  drawFilterOverlay(ctx, width, height)
  
  // Draw boost button
  drawBoostButton(ctx, width, height)
  
  // Draw RTA mode button
  drawRtaModeButton(ctx, width, height)
  
  // Draw tooltip if hovering
  if (hoverPosition.value && hoverInfo.value && audioStore.isStarted) {
    // Recalculate dB value with fresh audio data for reactivity
    const effectiveMode = audioStore.getEffectiveChannelMode()
    const aggregatedData = effectiveMode === 'stereo' ? 
      (hoverPosition.value.y <= height / 2 ? lastAggregatedLeft : lastAggregatedRight) : 
      lastAggregatedMono
    
    const freshDbResult = getDbAtX(
      hoverPosition.value.x, 
      width, 
      aggregatedData, 
      effectiveMode, 
      height, 
      hoverPosition.value.y
    )
    
    drawTooltip(
      ctx, 
      hoverPosition.value.x, 
      hoverPosition.value.y,
      hoverInfo.value.frequency, // Keep stable frequency
      freshDbResult.db, // Use fresh dB value
      width,
      height,
      freshDbResult.channel
    )
  }
  
  // Continue animation
  animationId = requestAnimationFrame(draw)
}

function drawMonoRTA(ctx: CanvasRenderingContext2D, width: number, height: number, freqData: Float32Array) {
  const aggregated = aggregateBands(freqData, sampleRate.value, 16384, bands, 'mean')
  lastAggregatedMono = aggregated // Store for tooltip
  const barWidth = width / aggregated.length
  
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

function drawStereoRTA(ctx: CanvasRenderingContext2D, width: number, height: number, leftData: Float32Array, rightData: Float32Array) {
  const channelHeight = height / 2
  const aggregatedLeft = aggregateBands(leftData, sampleRate.value, 16384, bands, 'mean')
  const aggregatedRight = aggregateBands(rightData, sampleRate.value, 16384, bands, 'mean')
  // Store for tooltip
  lastAggregatedLeft = aggregatedLeft
  lastAggregatedRight = aggregatedRight
  const barWidth = width / aggregatedLeft.length
  
  // Draw left channel (top half)
  for (let i = 0; i < aggregatedLeft.length; i++) {
    const dbValue = aggregatedLeft[i]
    const normalizedValue = (dbValue + 100) / 100
    const barHeight = Math.max(1, normalizedValue * channelHeight * 0.85)
    
    const x = i * barWidth
    const y = channelHeight - barHeight
    
    const intensity = normalizedValue
    if (intensity > 0.8) {
      ctx.fillStyle = '#00ff00'
    } else if (intensity > 0.6) {
      ctx.fillStyle = '#ffff00'
    } else {
      ctx.fillStyle = '#4fc3f7' // Slightly different blue for left
    }
    
    ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
  }
  
  // Draw right channel (bottom half)
  for (let i = 0; i < aggregatedRight.length; i++) {
    const dbValue = aggregatedRight[i]
    const normalizedValue = (dbValue + 100) / 100
    const barHeight = Math.max(1, normalizedValue * channelHeight * 0.85)
    
    const x = i * barWidth
    const y = height - barHeight
    
    const intensity = normalizedValue
    if (intensity > 0.8) {
      ctx.fillStyle = '#00ff00'
    } else if (intensity > 0.6) {
      ctx.fillStyle = '#ffff00'
    } else {
      ctx.fillStyle = '#29b6f6' // Slightly different blue for right
    }
    
    ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
  }
  
  // Draw separator line
  ctx.strokeStyle = '#555555'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, channelHeight)
  ctx.lineTo(width, channelHeight)
  ctx.stroke()
  
  // Draw channel labels
  ctx.fillStyle = '#ffffff'
  ctx.font = '14px monospace'
  ctx.textAlign = 'left'
  ctx.fillText('L', 5, 20)
  ctx.fillText('R', 5, channelHeight + 20)
}

function drawTooltip(ctx: CanvasRenderingContext2D, x: number, y: number, freq: number, db: number, canvasWidth: number, canvasHeight: number, channel?: 'L' | 'R') {
  // Format frequency
  const freqText = freq >= 1000 ? 
    `${(freq/1000).toFixed(freq >= 10000 ? 0 : 1)}kHz` : 
    `${Math.round(freq)}Hz`
  
  // Format dB
  const dbText = `${db.toFixed(1)}dB`
  
  // Format channel
  const channelText = channel ? ` (${channel})` : ''
  
  const text = `${freqText} | ${dbText}${channelText}`
  
  // Measure text
  const padding = 8
  ctx.font = 'bold 12px monospace'
  const metrics = ctx.measureText(text)
  const boxWidth = metrics.width + padding * 2
  const boxHeight = 24
  
  // Position tooltip (above cursor by default)
  let boxX = x - boxWidth / 2
  let boxY = y - boxHeight - 12
  
  // Clamp to canvas boundaries
  boxX = Math.max(5, Math.min(canvasWidth - boxWidth - 5, boxX))
  if (boxY < 5) {
    boxY = y + 12 // Show below if not enough space above
  }
  
  // Draw tooltip background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.95)'
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight)
  
  // Draw tooltip border
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)
  
  // Draw tooltip text
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, boxX + boxWidth / 2, boxY + boxHeight / 2)
  
  // Draw vertical line at cursor position
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(x, 90) // Start below buttons
  ctx.lineTo(x, canvasHeight - 30) // End above filter labels
  ctx.stroke()
  ctx.setLineDash([])
}

function drawRtaModeButton(ctx: CanvasRenderingContext2D, _width: number, _height: number) {
  const buttonWidth = 70
  const buttonHeight = 30
  const x = 10
  const y = 10
  
  // Button background
  ctx.fillStyle = audioStore.rtaMode === 'output' ? '#2196F3' : '#4CAF50'
  ctx.fillRect(x, y, buttonWidth, buttonHeight)
  
  // Button border
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, buttonWidth, buttonHeight)
  
  // Button text
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(audioStore.rtaMode.toUpperCase(), x + buttonWidth / 2, y + buttonHeight / 2)
}

function drawBoostButton(ctx: CanvasRenderingContext2D, width: number, _height: number) {
  const buttonWidth = 60
  const buttonHeight = 30
  const x = width - buttonWidth - 10
  const y = 50 // Below mode indicator
  
  // Button background
  ctx.fillStyle = audioStore.boostEnabled ? '#ff4444' : '#444444'
  ctx.fillRect(x, y, buttonWidth, buttonHeight)
  
  // Button border
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, buttonWidth, buttonHeight)
  
  // Button text
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 12px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('+20dB', x + buttonWidth / 2, y + buttonHeight / 2)
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
  
  const effectiveMode = audioStore.getEffectiveChannelMode()
  if (effectiveMode === 'stereo') {
    ctx.fillText(hpfLabel, hpfX, height / 2 - 5)
    ctx.fillText(lpfLabel, lpfX, height / 2 - 5)
  } else {
    ctx.fillText(hpfLabel, hpfX, height - 10)
    ctx.fillText(lpfLabel, lpfX, height - 10)
  }
  
  // Draw draggable handles
  ctx.fillStyle = '#ff4444'
  const handleHeight = 30
  
  if (effectiveMode === 'stereo') {
    // Draw handles for both channels
    const topHandleY = height / 4 - handleHeight / 2
    const bottomHandleY = (3 * height) / 4 - handleHeight / 2
    
    // HPF handles
    ctx.fillRect(hpfX - HANDLE_WIDTH/2, topHandleY, HANDLE_WIDTH, handleHeight)
    ctx.fillRect(hpfX - HANDLE_WIDTH/2, bottomHandleY, HANDLE_WIDTH, handleHeight)
    
    // LPF handles
    ctx.fillRect(lpfX - HANDLE_WIDTH/2, topHandleY, HANDLE_WIDTH, handleHeight)
    ctx.fillRect(lpfX - HANDLE_WIDTH/2, bottomHandleY, HANDLE_WIDTH, handleHeight)
  } else {
    // Draw single handles for mono
    const handleY = height / 2 - handleHeight / 2
    
    // HPF handle
    ctx.fillRect(hpfX - HANDLE_WIDTH/2, handleY, HANDLE_WIDTH, handleHeight)
    
    // LPF handle
    ctx.fillRect(lpfX - HANDLE_WIDTH/2, handleY, HANDLE_WIDTH, handleHeight)
  }
}

function onPointerDown(event: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const width = rect.width
  const height = rect.height
  
  const hpfX = frequencyToLogX(audioStore.hpfCutoff, 20, 20000, width)
  const lpfX = frequencyToLogX(audioStore.lpfCutoff, 20, 20000, width)
  
  // Calculate handle positions (center vertically or per channel)
  const effectiveMode = audioStore.getEffectiveChannelMode()
  // Check if clicking on RTA mode button first
  const rtaButtonWidth = 70
  const rtaButtonHeight = 30
  const rtaButtonX = 10
  const rtaButtonY = 10
  
  if (x >= rtaButtonX && x <= rtaButtonX + rtaButtonWidth && 
      y >= rtaButtonY && y <= rtaButtonY + rtaButtonHeight) {
    const newMode = audioStore.toggleRtaMode()
    console.log(`RTA mode toggled: ${newMode}`)
    return
  }
  
  // Check if clicking on boost button
  const boostButtonWidth = 60
  const boostButtonHeight = 30
  const boostButtonX = width - boostButtonWidth - 10
  const boostButtonY = 50
  
  if (x >= boostButtonX && x <= boostButtonX + boostButtonWidth && 
      y >= boostButtonY && y <= boostButtonY + boostButtonHeight) {
    const newState = audioStore.toggleBoost()
    setBoost(newState)
    console.log(`Boost toggled: ${newState}`)
    return
  }
  
  // Check filter handle clicks
  const handleY = effectiveMode === 'stereo' ? height / 4 : height / 2
  const handleHeight = 30
  
  // Check if clicking near handles (allow some vertical tolerance)
  const yTolerance = effectiveMode === 'stereo' ? height / 2 : height
  if (Math.abs(y - handleY) <= yTolerance && Math.abs(y - handleY) <= handleHeight) {
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
}

function getFrequencyAtX(x: number, width: number): number {
  const normalizedX = x / width
  const bandIndex = Math.floor(normalizedX * bands.length)
  if (bandIndex >= 0 && bandIndex < bands.length) {
    return bands[bandIndex].fCenter
  }
  return 0
}

function getDbAtX(x: number, width: number, aggregatedData: Float32Array | null, effectiveMode: 'mono' | 'stereo', canvasHeight: number, y: number): {db: number, channel?: 'L' | 'R'} {
  if (!aggregatedData) return { db: -100 }
  
  const normalizedX = x / width
  const bandIndex = Math.floor(normalizedX * aggregatedData.length)
  
  if (bandIndex < 0 || bandIndex >= aggregatedData.length) {
    return { db: -100 }
  }
  
  let channel: 'L' | 'R' | undefined = undefined
  
  // For stereo mode, determine which channel based on Y position
  if (effectiveMode === 'stereo') {
    const channelHeight = canvasHeight / 2
    if (y <= channelHeight) {
      channel = 'L'
      // Use left channel data if available
      if (lastAggregatedLeft && bandIndex < lastAggregatedLeft.length) {
        return { db: lastAggregatedLeft[bandIndex], channel }
      }
    } else {
      channel = 'R'
      // Use right channel data if available
      if (lastAggregatedRight && bandIndex < lastAggregatedRight.length) {
        return { db: lastAggregatedRight[bandIndex], channel }
      }
    }
  }
  
  return { db: aggregatedData[bandIndex], channel }
}

function isOverButton(x: number, y: number, width: number, _height: number): boolean {
  // RTA mode button (top left)
  if (x >= 10 && x <= 80 && y >= 10 && y <= 40) return true
  
  // Boost button (top right)
  if (x >= width - 70 && x <= width - 10 && y >= 50 && y <= 80) return true
  
  // Mode indicator area
  if (x >= width - 150 && x <= width - 10 && y >= 10 && y <= 40) return true
  
  return false
}

function onPointerMove(event: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  if (isDragging && dragType) {
    // Handle dragging filters
    const clampedX = Math.max(0, Math.min(rect.width, x))
    const frequency = logXToFrequency(clampedX, 20, 20000, rect.width)
    
    if (dragType === 'hpf') {
      setHpfCutoff(frequency)
    } else if (dragType === 'lpf') {
      setLpfCutoff(frequency)
    }
  } else {
    // Handle hover for tooltip
    const effectiveMode = audioStore.getEffectiveChannelMode()
    const inRtaArea = y > 90 && !isOverButton(x, y, rect.width, rect.height)
    
    if (inRtaArea && audioStore.isStarted) {
      const freq = getFrequencyAtX(x, rect.width)
      const aggregatedData = effectiveMode === 'stereo' ? 
        (y <= rect.height / 2 ? lastAggregatedLeft : lastAggregatedRight) : 
        lastAggregatedMono
      
      const dbResult = getDbAtX(x, rect.width, aggregatedData, effectiveMode, rect.height, y)
      
      hoverInfo.value = {
        frequency: freq,
        db: dbResult.db,
        channel: dbResult.channel
      }
      hoverPosition.value = { x, y }
    } else {
      hoverInfo.value = null
      hoverPosition.value = null
    }
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

.mode-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  font-weight: bold;
  z-index: 15;
}

.channel-status {
  font-weight: normal;
  opacity: 0.8;
  margin-left: 5px;
}
</style>