import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAudioStore = defineStore('audio', () => {
  const isInitialized = ref(false)
  const isStarted = ref(false)
  const hasPermission = ref(false)
  const errorMessage = ref('')
  
  const hpfCutoff = ref(80)
  const lpfCutoff = ref(12000)
  const minFilterDistance = ref(200) // Minimum 200Hz between HPF and LPF

  const setHpfCutoff = (frequency: number) => {
    const maxHpf = lpfCutoff.value - minFilterDistance.value
    hpfCutoff.value = Math.max(20, Math.min(maxHpf, frequency))
  }

  const setLpfCutoff = (frequency: number) => {
    const minLpf = hpfCutoff.value + minFilterDistance.value
    lpfCutoff.value = Math.max(minLpf, Math.min(20000, frequency))
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
    setHpfCutoff,
    setLpfCutoff,
    setError,
    clearError
  }
})