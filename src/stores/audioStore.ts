import { defineStore } from "pinia"
import { ref } from "vue"

export type ChannelMode = "mono" | "stereo" | "auto"
export type RtaMode = "input" | "output" | "both"

export interface ActiveChannels {
  left: boolean
  right: boolean
}

export const useAudioStore = defineStore("audio", () => {
  const isInitialized = ref(false)
  const isStarted = ref(false)
  const hasPermission = ref(false)
  const errorMessage = ref("")

  const hpfCutoff = ref(80)
  const lpfCutoff = ref(12000)
  const minFilterDistance = ref(10) // Minimum 10Hz between HPF and LPF
  const fixedDistanceEnabled = ref(false) // Enable/disable fixed distance mode
  const fixedDistance = ref(1000) // Fixed distance in Hz when mode is enabled

  // Stereo channel management
  const channelMode = ref<ChannelMode>("auto")
  const inputChannelCount = ref(1)
  const activeChannels = ref<ActiveChannels>({
    left: true,
    right: false,
  })

  // Boost control
  const boostEnabled = ref(false)

  // RTA display mode
  const rtaMode = ref<RtaMode>("output")

  // Power saving mode
  const powerSaveMode = ref(false)

  const setHpfCutoff = (frequency: number) => {
    if (fixedDistanceEnabled.value) {
      // In fixed distance mode, moving HPF also moves LPF
      const newHpf = Math.max(
        20,
        Math.min(20000 - fixedDistance.value, frequency)
      )
      const newLpf = newHpf + fixedDistance.value

      hpfCutoff.value = newHpf
      lpfCutoff.value = Math.min(20000, newLpf)
    } else {
      // Original behavior with minimum distance constraint
      const maxHpf = lpfCutoff.value - minFilterDistance.value
      hpfCutoff.value = Math.max(20, Math.min(maxHpf, frequency))
    }
  }

  const setLpfCutoff = (frequency: number) => {
    if (fixedDistanceEnabled.value) {
      // In fixed distance mode, moving LPF also moves HPF
      const newLpf = Math.max(
        fixedDistance.value + 20,
        Math.min(20000, frequency)
      )
      const newHpf = newLpf - fixedDistance.value

      lpfCutoff.value = newLpf
      hpfCutoff.value = Math.max(20, newHpf)
    } else {
      // Original behavior with minimum distance constraint
      const minLpf = hpfCutoff.value + minFilterDistance.value
      lpfCutoff.value = Math.max(minLpf, Math.min(20000, frequency))
    }
  }

  const setActiveChannels = (channels: ActiveChannels) => {
    activeChannels.value = channels
  }

  const setChannelMode = (mode: ChannelMode) => {
    channelMode.value = mode
  }

  const setInputChannelCount = (count: number) => {
    inputChannelCount.value = count
  }

  const getEffectiveChannelMode = (): "mono" | "stereo" => {
    if (channelMode.value === "mono") return "mono"
    if (channelMode.value === "stereo") return "stereo"

    // Auto mode: use stereo if both channels active and input is stereo
    return inputChannelCount.value >= 2 &&
      activeChannels.value.left &&
      activeChannels.value.right
      ? "stereo"
      : "mono"
  }

  const toggleBoost = (): boolean => {
    boostEnabled.value = !boostEnabled.value
    return boostEnabled.value
  }

  const setBoost = (enabled: boolean) => {
    boostEnabled.value = enabled
  }

  const toggleRtaMode = (): RtaMode => {
    const modes: RtaMode[] = ["input", "output", "both"]
    const currentIndex = modes.indexOf(rtaMode.value)
    const nextIndex = (currentIndex + 1) % modes.length
    rtaMode.value = modes[nextIndex]
    return rtaMode.value
  }

  const setRtaMode = (mode: RtaMode) => {
    rtaMode.value = mode
  }

  const togglePowerSave = (): boolean => {
    powerSaveMode.value = !powerSaveMode.value
    return powerSaveMode.value
  }

  const toggleFixedDistance = (): boolean => {
    fixedDistanceEnabled.value = !fixedDistanceEnabled.value
    if (fixedDistanceEnabled.value) {
      // When enabling, set the fixed distance to current distance
      fixedDistance.value = Math.max(
        minFilterDistance.value,
        lpfCutoff.value - hpfCutoff.value
      )
    }
    return fixedDistanceEnabled.value
  }

  const setFixedDistance = (distance: number) => {
    fixedDistance.value = Math.max(minFilterDistance.value, distance)
  }

  const setError = (message: string) => {
    errorMessage.value = message
  }

  const clearError = () => {
    errorMessage.value = ""
  }

  return {
    isInitialized,
    isStarted,
    hasPermission,
    errorMessage,
    hpfCutoff,
    lpfCutoff,
    minFilterDistance,
    fixedDistanceEnabled,
    fixedDistance,
    channelMode,
    inputChannelCount,
    activeChannels,
    boostEnabled,
    rtaMode,
    powerSaveMode,
    setHpfCutoff,
    setLpfCutoff,
    setActiveChannels,
    setChannelMode,
    setInputChannelCount,
    getEffectiveChannelMode,
    toggleBoost,
    setBoost,
    toggleRtaMode,
    setRtaMode,
    toggleFixedDistance,
    setFixedDistance,
    togglePowerSave,
    setError,
    clearError,
  }
})
