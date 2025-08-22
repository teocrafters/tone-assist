import { ref } from "vue"
import type { ActiveChannels } from "@/stores/audioStore"

interface SilenceState {
  left: {
    isSilent: boolean
    silenceStartTime: number | null
  }
  right: {
    isSilent: boolean
    silenceStartTime: number | null
  }
}

export function useSilenceDetector() {
  const SILENCE_THRESHOLD_DB = -60 // dB
  const SILENCE_DURATION_MS = 500 // milliseconds

  const silenceState = ref<SilenceState>({
    left: { isSilent: false, silenceStartTime: null },
    right: { isSilent: false, silenceStartTime: null },
  })

  const activeChannels = ref<ActiveChannels>({
    left: true,
    right: false,
  })

  function dbToLinear(db: number): number {
    return Math.pow(10, db / 20)
  }

  function calculateRMS(freqData: Float32Array): number {
    let sum = 0
    for (let i = 0; i < freqData.length; i++) {
      const linear = dbToLinear(freqData[i])
      sum += linear * linear
    }
    return Math.sqrt(sum / freqData.length)
  }

  function updateChannelActivity(
    channel: "left" | "right",
    freqData: Float32Array,
    currentTime: number
  ): boolean {
    const rms = calculateRMS(freqData)
    const rmsDb = 20 * Math.log10(Math.max(1e-10, rms))
    const isBelowThreshold = rmsDb < SILENCE_THRESHOLD_DB

    const channelState = silenceState.value[channel]

    if (isBelowThreshold) {
      // Signal is below threshold
      if (channelState.silenceStartTime === null) {
        // Start measuring silence
        channelState.silenceStartTime = currentTime
        channelState.isSilent = false // Not silent yet, just started measuring
      } else {
        // Check if silence duration exceeded
        const silenceDuration = currentTime - channelState.silenceStartTime
        if (silenceDuration >= SILENCE_DURATION_MS && !channelState.isSilent) {
          channelState.isSilent = true
        }
      }
    } else {
      // Signal is above threshold - reset silence tracking
      channelState.silenceStartTime = null
      channelState.isSilent = false
    }

    return !channelState.isSilent
  }

  function updateSilenceDetection(
    leftFreqData: Float32Array | null,
    rightFreqData: Float32Array | null
  ): ActiveChannels {
    const currentTime = performance.now()

    const newActiveChannels: ActiveChannels = {
      left: leftFreqData
        ? updateChannelActivity("left", leftFreqData, currentTime)
        : false,
      right: rightFreqData
        ? updateChannelActivity("right", rightFreqData, currentTime)
        : false,
    }

    // Ensure at least one channel is always active if any data is available
    if (!newActiveChannels.left && !newActiveChannels.right) {
      if (leftFreqData) newActiveChannels.left = true
      else if (rightFreqData) newActiveChannels.right = true
    }

    // Log channel state changes for debugging
    if (
      activeChannels.value.left !== newActiveChannels.left ||
      activeChannels.value.right !== newActiveChannels.right
    ) {
      console.log(
        `Channel activity changed: L:${newActiveChannels.left} R:${newActiveChannels.right}`
      )
    }

    activeChannels.value = newActiveChannels
    return newActiveChannels
  }

  function reset() {
    silenceState.value = {
      left: { isSilent: false, silenceStartTime: null },
      right: { isSilent: false, silenceStartTime: null },
    }
    activeChannels.value = { left: true, right: false }
  }

  return {
    activeChannels,
    silenceState,
    updateSilenceDetection,
    reset,
  }
}
