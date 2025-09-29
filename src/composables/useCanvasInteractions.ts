import { ref, type Ref } from "vue"
import {
  frequencyToLogX,
  logXToFrequency,
  type LogBandEdge,
} from "@/utils/logBands"
import { useAudioStore } from "@/stores/audioStore"
import type { RenderingData } from "./useRtaRenderer"

import { HANDLE_WIDTH } from "@/constants/canvas"

export function useCanvasInteractions(
  canvasRef: Ref<HTMLCanvasElement | null>,
  renderingData: RenderingData,
  bands: LogBandEdge[],
  setHpfCutoff: (freq: number) => void,
  setLpfCutoff: (freq: number) => void,
  updateAllFilterNodes: () => void,
  setBoost: (enabled: boolean) => void
) {
  const audioStore = useAudioStore()

  // Hover/touch tooltip state
  const hoverPosition = ref<{ x: number; y: number } | null>(null)
  const hoverInfo = ref<{
    frequency: number
    db: number
    channel?: "L" | "R"
  } | null>(null)

  // Drag state
  let isDragging = false
  let dragType: "hpf" | "lpf" | null = null

  function getFrequencyAtX(x: number, width: number): number {
    const normalizedX = x / width
    const bandIndex = Math.floor(normalizedX * bands.length)
    if (bandIndex >= 0 && bandIndex < bands.length) {
      return bands[bandIndex].fCenter
    }
    return 0
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

  function isOverButton(
    x: number,
    y: number,
    width: number,
    _height: number
  ): boolean {
    // RTA mode button (top left)
    if (x >= 10 && x <= 80 && y >= 10 && y <= 40) return true

    // Fixed distance button (next to RTA mode button)
    if (x >= 90 && x <= 175 && y >= 10 && y <= 40) return true

    // Boost button (top right)
    if (x >= width - 70 && x <= width - 10 && y >= 50 && y <= 80) return true

    // Mode indicator area
    if (x >= width - 150 && x <= width - 10 && y >= 10 && y <= 40) return true

    return false
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

    // Check if clicking on RTA mode button first
    const rtaButtonWidth = 70
    const rtaButtonHeight = 30
    const rtaButtonX = 10
    const rtaButtonY = 10

    if (
      x >= rtaButtonX &&
      x <= rtaButtonX + rtaButtonWidth &&
      y >= rtaButtonY &&
      y <= rtaButtonY + rtaButtonHeight
    ) {
      const newMode = audioStore.toggleRtaMode()
      console.log(`RTA mode toggled: ${newMode}`)
      return
    }

    // Check if clicking on fixed distance button
    const fixedButtonWidth = 85
    const fixedButtonHeight = 30
    const fixedButtonX = 90
    const fixedButtonY = 10

    if (
      x >= fixedButtonX &&
      x <= fixedButtonX + fixedButtonWidth &&
      y >= fixedButtonY &&
      y <= fixedButtonY + fixedButtonHeight
    ) {
      const newState = audioStore.toggleFixedDistance()
      // Synchronize all filter nodes after toggling fixed distance
      updateAllFilterNodes()
      console.log(`Fixed distance toggled: ${newState}`)
      return
    }

    // Check if clicking on boost button
    const boostButtonWidth = 60
    const boostButtonHeight = 30
    const boostButtonX = width - boostButtonWidth - 10
    const boostButtonY = 50

    if (
      x >= boostButtonX &&
      x <= boostButtonX + boostButtonWidth &&
      y >= boostButtonY &&
      y <= boostButtonY + boostButtonHeight
    ) {
      const newState = audioStore.toggleBoost()
      setBoost(newState)
      console.log(`Boost toggled: ${newState}`)
      return
    }

    // Check filter handle clicks
    const effectiveMode = audioStore.getEffectiveChannelMode()
    const handleY = effectiveMode === "stereo" ? height / 4 : height / 2
    const handleHeight = 30

    // Check if clicking near handles (allow some vertical tolerance)
    const yTolerance = effectiveMode === "stereo" ? height / 2 : height
    if (
      Math.abs(y - handleY) <= yTolerance &&
      Math.abs(y - handleY) <= handleHeight
    ) {
      // Check if clicking on HPF handle
      if (Math.abs(x - hpfX) <= HANDLE_WIDTH / 2) {
        isDragging = true
        dragType = "hpf"
        canvas.setPointerCapture(event.pointerId)
      }
      // Check if clicking on LPF handle
      else if (Math.abs(x - lpfX) <= HANDLE_WIDTH / 2) {
        isDragging = true
        dragType = "lpf"
        canvas.setPointerCapture(event.pointerId)
      }
    }
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

      if (dragType === "hpf") {
        setHpfCutoff(frequency)
      } else if (dragType === "lpf") {
        setLpfCutoff(frequency)
      }
    } else {
      // Handle hover for tooltip
      const effectiveMode = audioStore.getEffectiveChannelMode()
      const inRtaArea = y > 90 && !isOverButton(x, y, rect.width, rect.height)

      if (inRtaArea && audioStore.isStarted) {
        const freq = getFrequencyAtX(x, rect.width)
        const aggregatedData =
          effectiveMode === "stereo"
            ? y <= rect.height / 2
              ? renderingData.lastAggregatedLeft
              : renderingData.lastAggregatedRight
            : renderingData.lastAggregatedMono

        const dbResult = getDbAtX(
          x,
          rect.width,
          aggregatedData,
          effectiveMode,
          rect.height,
          y
        )

        hoverInfo.value = {
          frequency: freq,
          db: dbResult.db,
          channel: dbResult.channel,
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

  return {
    hoverPosition,
    hoverInfo,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
