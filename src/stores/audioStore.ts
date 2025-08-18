import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ChannelMode = 'mono' | 'stereo' | 'auto'

export interface ActiveChannels {
  left: boolean
  right: boolean
}

export const useAudioStore = defineStore('audio', () => {
  const isInitialized = ref(false)
  const isStarted = ref(false)
  const hasPermission = ref(false)
  const errorMessage = ref('')
  
  const hpfCutoff = ref(80)
  const lpfCutoff = ref(12000)
  const minFilterDistance = ref(10) // Minimum 10Hz between HPF and LPF

  // Stereo channel management
  const channelMode = ref<ChannelMode>('auto')
  const inputChannelCount = ref(1)
  const activeChannels = ref<ActiveChannels>({
    left: true,
    right: false
  })

  // Boost control
  const boostEnabled = ref(false)

  const setHpfCutoff = (frequency: number) => {
    const maxHpf = lpfCutoff.value - minFilterDistance.value
    hpfCutoff.value = Math.max(20, Math.min(maxHpf, frequency))
  }

  const setLpfCutoff = (frequency: number) => {
    const minLpf = hpfCutoff.value + minFilterDistance.value
    lpfCutoff.value = Math.max(minLpf, Math.min(20000, frequency))
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

  const getEffectiveChannelMode = (): 'mono' | 'stereo' => {
    if (channelMode.value === 'mono') return 'mono'
    if (channelMode.value === 'stereo') return 'stereo'
    
    // Auto mode: use stereo if both channels active and input is stereo
    return (inputChannelCount.value >= 2 && activeChannels.value.left && activeChannels.value.right) 
      ? 'stereo' 
      : 'mono'
  }

  const toggleBoost = (): boolean => {
    boostEnabled.value = !boostEnabled.value
    return boostEnabled.value
  }

  const setBoost = (enabled: boolean) => {
    boostEnabled.value = enabled
  }

  const setError = (message: string) => {
    errorMessage.value = message
  }

  const clearError = () => {
    errorMessage.value = ''
  }

  return {
    isInitialized,
    isStarted,
    hasPermission,
    errorMessage,
    hpfCutoff,
    lpfCutoff,
    minFilterDistance,
    channelMode,
    inputChannelCount,
    activeChannels,
    boostEnabled,
    setHpfCutoff,
    setLpfCutoff,
    setActiveChannels,
    setChannelMode,
    setInputChannelCount,
    getEffectiveChannelMode,
    toggleBoost,
    setBoost,
    setError,
    clearError
  }
})