import { ref } from 'vue'
import { useAudioStore } from '@/stores/audioStore'

export function useAudioGraph() {
  const audioCtx = ref<AudioContext | null>(null)
  const source = ref<MediaStreamAudioSourceNode | null>(null)
  const analyser = ref<AnalyserNode | null>(null)
  
  const hpfNodes: BiquadFilterNode[] = []
  const lpfNodes: BiquadFilterNode[] = []
  
  const audioStore = useAudioStore()
  const sampleRate = ref(48000)

  const Q_VALUE = Math.SQRT1_2 // ~0.707 for Butterworth response

  async function init() {
    try {
      audioStore.clearError()

      // Create AudioContext with interactive latency hint for minimal latency
      // @ts-ignore - Support for webkitAudioContext on older Safari
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) {
        throw new Error('Web Audio API not supported')
      }

      audioCtx.value = new AudioCtx({ 
        latencyHint: 'interactive',
        sampleRate: 48000 
      })
      sampleRate.value = audioCtx.value.sampleRate

      // Request microphone access with optimized settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000
        }
      })

      audioStore.hasPermission = true
      source.value = new MediaStreamAudioSourceNode(audioCtx.value, { 
        mediaStream: stream 
      })

      // Create HPF cascade (4 stages for 48dB/oct slope)
      for (let i = 0; i < 4; i++) {
        const hpf = new BiquadFilterNode(audioCtx.value, {
          type: 'highpass',
          frequency: audioStore.hpfCutoff,
          Q: Q_VALUE
        })
        hpfNodes.push(hpf)
      }

      // Create LPF cascade (4 stages for 48dB/oct slope)
      for (let i = 0; i < 4; i++) {
        const lpf = new BiquadFilterNode(audioCtx.value, {
          type: 'lowpass',
          frequency: audioStore.lpfCutoff,
          Q: Q_VALUE
        })
        lpfNodes.push(lpf)
      }

      // Create analyser for RTA visualization
      analyser.value = new AnalyserNode(audioCtx.value, {
        fftSize: 16384,
        smoothingTimeConstant: 0.85,
        minDecibels: -100,
        maxDecibels: -20
      })

      // Connect the audio graph: source -> HPF cascade -> LPF cascade -> analyser -> destination
      let currentNode: AudioNode = source.value
      
      // Chain HPF nodes
      hpfNodes.forEach(node => {
        currentNode.connect(node)
        currentNode = node
      })

      // Chain LPF nodes
      lpfNodes.forEach(node => {
        currentNode.connect(node)
        currentNode = node
      })

      // Connect to analyser for visualization
      currentNode.connect(analyser.value)
      
      // Connect to speakers/headphones for monitoring
      analyser.value.connect(audioCtx.value.destination)

      audioStore.isInitialized = true

    } catch (error) {
      console.error('Audio initialization failed:', error)
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          audioStore.setError('Microphone access denied. Please allow microphone access and try again.')
        } else if (error.name === 'NotFoundError') {
          audioStore.setError('No microphone found. Please connect a microphone and try again.')
        } else {
          audioStore.setError(`Audio initialization failed: ${error.message}`)
        }
      } else {
        audioStore.setError('Unknown error during audio initialization')
      }
    }
  }

  async function start() {
    if (!audioCtx.value) {
      await init()
    }

    try {
      // Resume AudioContext on user gesture (required for iOS)
      if (audioCtx.value?.state !== 'running') {
        await audioCtx.value?.resume()
      }
      audioStore.isStarted = true
    } catch (error) {
      console.error('Failed to start audio:', error)
      audioStore.setError('Failed to start audio processing')
    }
  }

  function setHpfCutoff(frequency: number) {
    audioStore.setHpfCutoff(frequency)
    hpfNodes.forEach(node => {
      node.frequency.value = audioStore.hpfCutoff
    })
  }

  function setLpfCutoff(frequency: number) {
    audioStore.setLpfCutoff(frequency)
    lpfNodes.forEach(node => {
      node.frequency.value = audioStore.lpfCutoff
    })
  }

  function stop() {
    if (source.value?.mediaStream) {
      source.value.mediaStream.getTracks().forEach(track => track.stop())
    }
    if (audioCtx.value) {
      audioCtx.value.close()
    }
    audioStore.isStarted = false
    audioStore.isInitialized = false
  }

  return {
    audioCtx,
    source,
    analyser,
    sampleRate,
    init,
    start,
    stop,
    setHpfCutoff,
    setLpfCutoff
  }
}