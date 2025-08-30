import type { Ref } from "vue"
import { aggregateBands, type LogBandEdge } from "@/utils/logBands"

export interface RenderingData {
  lastAggregatedLeft: Float32Array | null
  lastAggregatedRight: Float32Array | null
  lastAggregatedMono: Float32Array | null
}

export function useRtaRenderer(bands: LogBandEdge[], sampleRate: Ref<number>) {
  const renderingData: RenderingData = {
    lastAggregatedLeft: null,
    lastAggregatedRight: null,
    lastAggregatedMono: null,
  }

  function drawMonoRTA(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    freqData: Float32Array
  ) {
    const aggregated = aggregateBands(
      freqData,
      sampleRate.value,
      16384,
      bands,
      "mean"
    )
    renderingData.lastAggregatedMono = aggregated
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
        ctx.fillStyle = "#00ff00" // Green for high levels
      } else if (intensity > 0.6) {
        ctx.fillStyle = "#ffff00" // Yellow for medium-high levels
      } else {
        ctx.fillStyle = "#39c4ff" // Blue for normal levels
      }

      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
    }
  }

  function drawStereoRTA(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    leftData: Float32Array,
    rightData: Float32Array
  ) {
    const channelHeight = height / 2
    const aggregatedLeft = aggregateBands(
      leftData,
      sampleRate.value,
      16384,
      bands,
      "mean"
    )
    const aggregatedRight = aggregateBands(
      rightData,
      sampleRate.value,
      16384,
      bands,
      "mean"
    )
    // Store for tooltip
    renderingData.lastAggregatedLeft = aggregatedLeft
    renderingData.lastAggregatedRight = aggregatedRight
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
        ctx.fillStyle = "#00ff00"
      } else if (intensity > 0.6) {
        ctx.fillStyle = "#ffff00"
      } else {
        ctx.fillStyle = "#4fc3f7" // Slightly different blue for left
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
        ctx.fillStyle = "#00ff00"
      } else if (intensity > 0.6) {
        ctx.fillStyle = "#ffff00"
      } else {
        ctx.fillStyle = "#29b6f6" // Slightly different blue for right
      }

      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
    }

    // Draw separator line
    ctx.strokeStyle = "#555555"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, channelHeight)
    ctx.lineTo(width, channelHeight)
    ctx.stroke()

    // Draw channel labels
    ctx.fillStyle = "#ffffff"
    ctx.font = "14px monospace"
    ctx.textAlign = "left"
    ctx.fillText("L", 5, 20)
    ctx.fillText("R", 5, channelHeight + 20)
  }

  function drawMonoBothRTA(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    inputData: Float32Array,
    outputData: Float32Array
  ) {
    const inputAggregated = aggregateBands(
      inputData,
      sampleRate.value,
      16384,
      bands,
      "mean"
    )
    const outputAggregated = aggregateBands(
      outputData,
      sampleRate.value,
      16384,
      bands,
      "mean"
    )

    renderingData.lastAggregatedMono = inputAggregated
    const barWidth = width / inputAggregated.length

    for (let i = 0; i < inputAggregated.length; i++) {
      const inputDb = inputAggregated[i]
      const outputDb = outputAggregated[i]
      const inputNormalized = (inputDb + 100) / 100
      const outputNormalized = (outputDb + 100) / 100

      const inputHeight = Math.max(1, inputNormalized * height * 0.9)
      const outputHeight = Math.max(1, outputNormalized * height * 0.9)

      const x = i * barWidth

      // Draw input (background, semi-transparent)
      ctx.globalAlpha = 0.5
      ctx.fillStyle = "#4CAF50" // Green for input
      ctx.fillRect(
        x,
        height - inputHeight,
        Math.max(1, barWidth - 1),
        inputHeight
      )

      // Draw output (foreground, full opacity)
      ctx.globalAlpha = 1.0
      ctx.fillStyle = "#2196F3" // Blue for output
      ctx.fillRect(
        x,
        height - outputHeight,
        Math.max(1, barWidth - 1),
        outputHeight
      )
    }

    ctx.globalAlpha = 1.0
  }

  function drawStereoBothRTA(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    leftInputData: Float32Array,
    rightInputData: Float32Array,
    leftOutputData: Float32Array,
    rightOutputData: Float32Array
  ) {
    const channelHeight = height / 2

    // Aggregate all data
    const leftInputAgg = aggregateBands(
      leftInputData,
      sampleRate.value,
      16384,
      bands,
      "mean"
    )
    const rightInputAgg = aggregateBands(
      rightInputData,
      sampleRate.value,
      16384,
      bands,
      "mean"
    )
    const leftOutputAgg = aggregateBands(
      leftOutputData,
      sampleRate.value,
      16384,
      bands,
      "mean"
    )
    const rightOutputAgg = aggregateBands(
      rightOutputData,
      sampleRate.value,
      16384,
      bands,
      "mean"
    )

    // Store for tooltip
    renderingData.lastAggregatedLeft = leftInputAgg
    renderingData.lastAggregatedRight = rightInputAgg

    const barWidth = width / leftInputAgg.length

    // Draw left channel (top half)
    for (let i = 0; i < leftInputAgg.length; i++) {
      const inputNormalized = (leftInputAgg[i] + 100) / 100
      const outputNormalized = (leftOutputAgg[i] + 100) / 100

      const inputHeight = Math.max(1, inputNormalized * channelHeight * 0.85)
      const outputHeight = Math.max(1, outputNormalized * channelHeight * 0.85)

      const x = i * barWidth

      // Draw input (background)
      ctx.globalAlpha = 0.5
      ctx.fillStyle = "#4CAF50"
      ctx.fillRect(
        x,
        channelHeight - inputHeight,
        Math.max(1, barWidth - 1),
        inputHeight
      )

      // Draw output (foreground)
      ctx.globalAlpha = 1.0
      ctx.fillStyle = "#4fc3f7"
      ctx.fillRect(
        x,
        channelHeight - outputHeight,
        Math.max(1, barWidth - 1),
        outputHeight
      )
    }

    // Draw right channel (bottom half)
    for (let i = 0; i < rightInputAgg.length; i++) {
      const inputNormalized = (rightInputAgg[i] + 100) / 100
      const outputNormalized = (rightOutputAgg[i] + 100) / 100

      const inputHeight = Math.max(1, inputNormalized * channelHeight * 0.85)
      const outputHeight = Math.max(1, outputNormalized * channelHeight * 0.85)

      const x = i * barWidth

      // Draw input (background)
      ctx.globalAlpha = 0.5
      ctx.fillStyle = "#4CAF50"
      ctx.fillRect(
        x,
        height - inputHeight,
        Math.max(1, barWidth - 1),
        inputHeight
      )

      // Draw output (foreground)
      ctx.globalAlpha = 1.0
      ctx.fillStyle = "#29b6f6"
      ctx.fillRect(
        x,
        height - outputHeight,
        Math.max(1, barWidth - 1),
        outputHeight
      )
    }

    ctx.globalAlpha = 1.0

    // Draw separator line
    ctx.strokeStyle = "#555555"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, channelHeight)
    ctx.lineTo(width, channelHeight)
    ctx.stroke()

    // Draw channel labels
    ctx.fillStyle = "#ffffff"
    ctx.font = "14px monospace"
    ctx.textAlign = "left"
    ctx.fillText("L", 5, 20)
    ctx.fillText("R", 5, channelHeight + 20)
  }

  return {
    drawMonoRTA,
    drawStereoRTA,
    drawMonoBothRTA,
    drawStereoBothRTA,
    renderingData,
  }
}
