<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue"
import { useAudioGraph } from "@/composables/useAudioGraph"
import { useAudioStore } from "@/stores/audioStore"
import { useSilenceDetector } from "@/composables/useSilenceDetector"
import { makeLogBands } from "@/utils/logBands"
import { useRtaCanvas } from "@/composables/useRtaCanvas"
import { useRtaRenderer } from "@/composables/useRtaRenderer"
import { useCanvasInteractions } from "@/composables/useCanvasInteractions"
import { useCanvasUI } from "@/composables/useCanvasUI"
import RtaOverlay from "@/components/ui/RtaOverlay.vue"

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const audioStore = useAudioStore()
const starting = ref(false)

const {
  analyserLeftInput,
  analyserRightInput,
  analyserLeftOutput,
  analyserRightOutput,
  sampleRate,
  start,
  setHpfCutoff,
  setLpfCutoff,
  updateAllFilterNodes,
  updateAudioRouting,
  setBoost,
} = useAudioGraph()

const silenceDetector = useSilenceDetector()
const bands = makeLogBands(20, 20000, 120)

// Initialize composables
const { setupCanvas, startAnimation, stopAnimation, handleResize } =
  useRtaCanvas(canvasRef, containerRef)
const {
  drawMonoRTA,
  drawStereoRTA,
  drawMonoBothRTA,
  drawStereoBothRTA,
  renderingData,
} = useRtaRenderer(bands, sampleRate)
const {
  drawTooltip,
  drawRtaModeButton,
  drawFixedDistanceButton,
  drawBoostButton,
  drawFilterOverlay,
} = useCanvasUI()
const { hoverPosition, hoverInfo, onPointerDown, onPointerMove, onPointerUp } =
  useCanvasInteractions(
    canvasRef,
    renderingData,
    bands,
    setHpfCutoff,
    setLpfCutoff,
    updateAllFilterNodes,
    setBoost
  )

// Audio data management
let leftFreqData: Float32Array | null = null
let rightFreqData: Float32Array | null = null

async function startAudio() {
  starting.value = true
  try {
    await start()
  } finally {
    starting.value = false
  }
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const rect = canvas.getBoundingClientRect()
  const width = rect.width
  const height = rect.height

  // Clear canvas
  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, width, height)

  // Draw RTA if audio is running
  if (
    audioStore.isStarted &&
    (analyserLeftInput.value || analyserRightInput.value)
  ) {
    drawRTAContent(ctx, width, height)
  }

  // Draw UI elements
  drawFilterOverlay(ctx, width, height)
  drawBoostButton(ctx, width, height)
  drawRtaModeButton(ctx, width, height)
  drawFixedDistanceButton(ctx, width, height)

  // Draw tooltip if hovering
  if (hoverPosition.value && hoverInfo.value && audioStore.isStarted) {
    // Recalculate dB value with fresh audio data for reactivity
    const effectiveMode = audioStore.getEffectiveChannelMode()
    const aggregatedData =
      effectiveMode === "stereo"
        ? hoverPosition.value.y <= height / 2
          ? renderingData.lastAggregatedLeft
          : renderingData.lastAggregatedRight
        : renderingData.lastAggregatedMono

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
}

function drawRTAContent(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  if (audioStore.rtaMode === "both") {
    drawBothModeRTA(ctx, width, height)
  } else {
    drawSingleModeRTA(ctx, width, height)
  }
}

function drawSingleModeRTA(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Select analyzers based on RTA mode
  const leftAnalyser =
    audioStore.rtaMode === "input"
      ? analyserLeftInput.value
      : analyserLeftOutput.value
  const rightAnalyser =
    audioStore.rtaMode === "input"
      ? analyserRightInput.value
      : analyserRightOutput.value

  // Get frequency data from both channels
  if (leftAnalyser) {
    if (
      !leftFreqData ||
      leftFreqData.length !== leftAnalyser.frequencyBinCount
    ) {
      leftFreqData = new Float32Array(
        new ArrayBuffer(leftAnalyser.frequencyBinCount * 4)
      )
    }
    leftAnalyser.getFloatFrequencyData(leftFreqData)

    // Apply boost compensation if showing output mode and boost is enabled
    if (audioStore.rtaMode === "output" && audioStore.boostEnabled) {
      for (let i = 0; i < leftFreqData.length; i++) {
        leftFreqData[i] += 20 // Add 20dB
      }
    }
  }

  if (rightAnalyser) {
    if (
      !rightFreqData ||
      rightFreqData.length !== rightAnalyser.frequencyBinCount
    ) {
      rightFreqData = new Float32Array(rightAnalyser.frequencyBinCount)
    }
    rightAnalyser.getFloatFrequencyData(rightFreqData)

    // Apply boost compensation if showing output mode and boost is enabled
    if (audioStore.rtaMode === "output" && audioStore.boostEnabled) {
      for (let i = 0; i < rightFreqData.length; i++) {
        rightFreqData[i] += 20 // Add 20dB
      }
    }
  }

  // Update silence detection
  const activeChannels = silenceDetector.updateSilenceDetection(
    leftFreqData,
    rightFreqData
  )
  const previousChannels = { ...audioStore.activeChannels }
  audioStore.setActiveChannels(activeChannels)

  // Update audio routing if channels changed
  if (
    previousChannels.left !== activeChannels.left ||
    previousChannels.right !== activeChannels.right
  ) {
    updateAudioRouting(activeChannels)
  }

  const effectiveMode = audioStore.getEffectiveChannelMode()

  if (
    effectiveMode === "stereo" &&
    activeChannels.left &&
    activeChannels.right
  ) {
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

function drawBothModeRTA(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Get both input and output data
  let leftInputData: Float32Array<ArrayBuffer> | null = null
  let rightInputData: Float32Array<ArrayBuffer> | null = null
  let leftOutputData: Float32Array<ArrayBuffer> | null = null
  let rightOutputData: Float32Array<ArrayBuffer> | null = null

  // Get input data
  if (analyserLeftInput.value) {
    leftInputData = new Float32Array(analyserLeftInput.value.frequencyBinCount)
    analyserLeftInput.value.getFloatFrequencyData(leftInputData)
  }
  if (analyserRightInput.value) {
    rightInputData = new Float32Array(
      analyserRightInput.value.frequencyBinCount
    )
    analyserRightInput.value.getFloatFrequencyData(rightInputData)
  }

  // Get output data
  if (analyserLeftOutput.value) {
    leftOutputData = new Float32Array(
      analyserLeftOutput.value.frequencyBinCount
    )
    analyserLeftOutput.value.getFloatFrequencyData(leftOutputData)

    // Apply boost compensation if enabled
    if (audioStore.boostEnabled) {
      for (let i = 0; i < leftOutputData.length; i++) {
        leftOutputData[i] += 20
      }
    }
  }
  if (analyserRightOutput.value) {
    rightOutputData = new Float32Array(
      analyserRightOutput.value.frequencyBinCount
    )
    analyserRightOutput.value.getFloatFrequencyData(rightOutputData)

    // Apply boost compensation if enabled
    if (audioStore.boostEnabled) {
      for (let i = 0; i < rightOutputData.length; i++) {
        rightOutputData[i] += 20
      }
    }
  }

  // Update silence detection with input data
  const activeChannels = silenceDetector.updateSilenceDetection(
    leftInputData,
    rightInputData
  )
  const previousChannels = { ...audioStore.activeChannels }
  audioStore.setActiveChannels(activeChannels)

  // Update audio routing if channels changed
  if (
    previousChannels.left !== activeChannels.left ||
    previousChannels.right !== activeChannels.right
  ) {
    updateAudioRouting(activeChannels)
  }

  const effectiveMode = audioStore.getEffectiveChannelMode()

  if (
    effectiveMode === "stereo" &&
    activeChannels.left &&
    activeChannels.right
  ) {
    // Draw both input and output for stereo
    drawStereoBothRTA(
      ctx,
      width,
      height,
      leftInputData!,
      rightInputData!,
      leftOutputData!,
      rightOutputData!
    )
  } else {
    // Draw both input and output for mono
    const inputData = activeChannels.left ? leftInputData : rightInputData
    const outputData = activeChannels.left ? leftOutputData : rightOutputData
    if (inputData && outputData) {
      drawMonoBothRTA(ctx, width, height, inputData, outputData)
    }
  }
}

function getDbAtX(
  x: number,
  width: number,
  aggregatedData: Float32Array | null,
  effectiveMode: "mono" | "stereo",
  canvasHeight: number,
  y: number
): { db: number; channel?: "L" | "R" } {
  if (!aggregatedData) return { db: -100 }

  const normalizedX = x / width
  const bandIndex = Math.floor(normalizedX * aggregatedData.length)

  if (bandIndex < 0 || bandIndex >= aggregatedData.length) {
    return { db: -100 }
  }

  let channel: "L" | "R" | undefined = undefined

  // For stereo mode, determine which channel based on Y position
  if (effectiveMode === "stereo") {
    const channelHeight = canvasHeight / 2
    if (y <= channelHeight) {
      channel = "L"
      // Use left channel data if available
      if (
        renderingData.lastAggregatedLeft &&
        bandIndex < renderingData.lastAggregatedLeft.length
      ) {
        return { db: renderingData.lastAggregatedLeft[bandIndex], channel }
      }
    } else {
      channel = "R"
      // Use right channel data if available
      if (
        renderingData.lastAggregatedRight &&
        bandIndex < renderingData.lastAggregatedRight.length
      ) {
        return { db: renderingData.lastAggregatedRight[bandIndex], channel }
      }
    }
  }

  return { db: aggregatedData[bandIndex], channel }
}

onMounted(() => {
  nextTick(() => {
    setupCanvas()
    startAnimation(draw)
    window.addEventListener("resize", handleResize)
  })
})

onBeforeUnmount(() => {
  stopAnimation()
  window.removeEventListener("resize", handleResize)
})
</script>

<template>
  <div ref="containerRef" class="rta-container">
    <canvas
      ref="canvasRef"
      class="rta-canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp" />

    <RtaOverlay :starting="starting" @start-audio="startAudio" />
  </div>
</template>

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
</style>
