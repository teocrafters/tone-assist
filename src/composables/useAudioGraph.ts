import { ref } from 'vue'
import { useAudioStore, type ActiveChannels } from '@/stores/audioStore'

export function useAudioGraph() {
  const audioCtx = ref<AudioContext | null>(null)
  const source = ref<MediaStreamAudioSourceNode | null>(null)
  
  // Input analyzers (before filters)
  const analyserLeftInput = ref<AnalyserNode | null>(null)
  const analyserRightInput = ref<AnalyserNode | null>(null)
  
  // Output analyzers (after filters)
  const analyserLeftOutput = ref<AnalyserNode | null>(null)
  const analyserRightOutput = ref<AnalyserNode | null>(null)
  
  // Filter chains for both channels
  const leftHpfNodes: BiquadFilterNode[] = []
  const leftLpfNodes: BiquadFilterNode[] = []
  const rightHpfNodes: BiquadFilterNode[] = []
  const rightLpfNodes: BiquadFilterNode[] = []
  
  // Channel routing nodes
  let channelSplitter: ChannelSplitterNode | null = null
  let channelMerger: ChannelMergerNode | null = null
  let boostGainNode: GainNode | null = null
  
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

      // Request microphone access with stereo support
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 2, min: 1 },
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
      
      // Detect actual channel count from the stream
      const actualChannels = stream.getAudioTracks()[0]?.getSettings()?.channelCount || 1
      audioStore.setInputChannelCount(actualChannels)

      // Create channel splitter for stereo processing
      channelSplitter = new ChannelSplitterNode(audioCtx.value, { numberOfOutputs: 2 })
      channelMerger = new ChannelMergerNode(audioCtx.value, { numberOfInputs: 2 })
      
      // Create filter cascades for LEFT channel
      for (let i = 0; i < 4; i++) {
        const hpf = new BiquadFilterNode(audioCtx.value, {
          type: 'highpass',
          frequency: audioStore.hpfCutoff,
          Q: Q_VALUE
        })
        const lpf = new BiquadFilterNode(audioCtx.value, {
          type: 'lowpass',
          frequency: audioStore.lpfCutoff,
          Q: Q_VALUE
        })
        leftHpfNodes.push(hpf)
        leftLpfNodes.push(lpf)
      }
      
      // Create filter cascades for RIGHT channel
      for (let i = 0; i < 4; i++) {
        const hpf = new BiquadFilterNode(audioCtx.value, {
          type: 'highpass',
          frequency: audioStore.hpfCutoff,
          Q: Q_VALUE
        })
        const lpf = new BiquadFilterNode(audioCtx.value, {
          type: 'lowpass',
          frequency: audioStore.lpfCutoff,
          Q: Q_VALUE
        })
        rightHpfNodes.push(hpf)
        rightLpfNodes.push(lpf)
      }

      // Create input analyzers (before filters)
      analyserLeftInput.value = new AnalyserNode(audioCtx.value, {
        fftSize: 16384,
        smoothingTimeConstant: 0.85,
        minDecibels: -100,
        maxDecibels: -20
      })
      
      analyserRightInput.value = new AnalyserNode(audioCtx.value, {
        fftSize: 16384,
        smoothingTimeConstant: 0.85,
        minDecibels: -100,
        maxDecibels: -20
      })
      
      // Create output analyzers (after filters)
      analyserLeftOutput.value = new AnalyserNode(audioCtx.value, {
        fftSize: 16384,
        smoothingTimeConstant: 0.85,
        minDecibels: -100,
        maxDecibels: -20
      })
      
      analyserRightOutput.value = new AnalyserNode(audioCtx.value, {
        fftSize: 16384,
        smoothingTimeConstant: 0.85,
        minDecibels: -100,
        maxDecibels: -20
      })

      // Connect the stereo audio graph
      source.value.connect(channelSplitter)
      
      // Connect input analyzers directly to splitter outputs
      channelSplitter.connect(analyserLeftInput.value, 0)
      channelSplitter.connect(analyserRightInput.value, 1)
      
      // LEFT channel chain: splitter[0] -> HPF cascade -> LPF cascade -> output analyser -> merger[0]
      let leftNode: AudioNode = channelSplitter
      leftHpfNodes.forEach((node, index) => {
        if (index === 0) {
          leftNode.connect(node, 0) // Connect from left output of splitter
        } else {
          leftNode.connect(node)
        }
        leftNode = node
      })
      
      leftLpfNodes.forEach(node => {
        leftNode.connect(node)
        leftNode = node
      })
      
      leftNode.connect(analyserLeftOutput.value)
      
      // RIGHT channel chain: splitter[1] -> HPF cascade -> LPF cascade -> output analyser -> merger[1]
      let rightNode: AudioNode = channelSplitter
      rightHpfNodes.forEach((node, index) => {
        if (index === 0) {
          rightNode.connect(node, 1) // Connect from right output of splitter
        } else {
          rightNode.connect(node)
        }
        rightNode = node
      })
      
      rightLpfNodes.forEach(node => {
        rightNode.connect(node)
        rightNode = node
      })
      
      rightNode.connect(analyserRightOutput.value)
      
      // Create boost gain node
      boostGainNode = new GainNode(audioCtx.value, { gain: 1.0 })
      
      // Initial routing setup - will be updated dynamically
      updateAudioRouting({
        left: true,
        right: actualChannels >= 2
      })
      
      // Connect merged output through boost gain to destination
      channelMerger.connect(boostGainNode)
      boostGainNode.connect(audioCtx.value.destination)

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
    // Update both left and right channel filters
    leftHpfNodes.forEach(node => {
      node.frequency.value = audioStore.hpfCutoff
    })
    rightHpfNodes.forEach(node => {
      node.frequency.value = audioStore.hpfCutoff
    })
  }

  function setLpfCutoff(frequency: number) {
    audioStore.setLpfCutoff(frequency)
    // Update both left and right channel filters
    leftLpfNodes.forEach(node => {
      node.frequency.value = audioStore.lpfCutoff
    })
    rightLpfNodes.forEach(node => {
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

  function updateAudioRouting(activeChannels: ActiveChannels) {
    if (!channelMerger || !analyserLeftOutput.value || !analyserRightOutput.value) {
      return
    }

    // Disconnect all existing connections from analyzers to merger
    try {
      analyserLeftOutput.value.disconnect(channelMerger)
      analyserRightOutput.value.disconnect(channelMerger)
    } catch (e) {
      // Connections might not exist yet, that's ok
    }

    const effectiveMode = audioStore.getEffectiveChannelMode()
    
    if (effectiveMode === 'mono') {
      // Mono routing: duplicate active channel to both outputs
      if (activeChannels.left && !activeChannels.right) {
        // Left channel active - duplicate to both outputs
        analyserLeftOutput.value.connect(channelMerger, 0, 0) // L→L
        analyserLeftOutput.value.connect(channelMerger, 0, 1) // L→R (duplicate)
      } else if (activeChannels.right && !activeChannels.left) {
        // Right channel active - duplicate to both outputs
        analyserRightOutput.value.connect(channelMerger, 0, 0) // R→L (duplicate)
        analyserRightOutput.value.connect(channelMerger, 0, 1) // R→R
      } else if (activeChannels.left) {
        // Default to left if both or neither active
        analyserLeftOutput.value.connect(channelMerger, 0, 0) // L→L
        analyserLeftOutput.value.connect(channelMerger, 0, 1) // L→R (duplicate)
      }
    } else {
      // Stereo routing: normal L→L, R→R connections
      if (activeChannels.left) {
        analyserLeftOutput.value.connect(channelMerger, 0, 0) // L→L
      }
      if (activeChannels.right) {
        analyserRightOutput.value.connect(channelMerger, 0, 1) // R→R
      }
      
      // If only one channel is active in stereo mode, still maintain stereo but mute the inactive side
      if (activeChannels.left && !activeChannels.right) {
        // Left active, right silent - don't connect right
      } else if (activeChannels.right && !activeChannels.left) {
        // Right active, left silent - don't connect left
      }
    }
    
    console.log(`Audio routing updated: ${effectiveMode} mode, L:${activeChannels.left} R:${activeChannels.right}`)
  }

  function setBoost(enabled: boolean) {
    if (!boostGainNode || !audioCtx.value) {
      console.warn('Boost gain node not initialized')
      return
    }

    const targetGain = enabled ? 10.0 : 1.0 // 20dB = 20log10(10) = 10x
    const currentTime = audioCtx.value.currentTime
    
    // Smooth transition over 50ms to avoid clicks/pops
    boostGainNode.gain.cancelScheduledValues(currentTime)
    boostGainNode.gain.setValueAtTime(boostGainNode.gain.value, currentTime)
    boostGainNode.gain.linearRampToValueAtTime(targetGain, currentTime + 0.05)
    
    console.log(`Boost ${enabled ? 'enabled' : 'disabled'}: ${targetGain}x gain (${enabled ? 20 : 0}dB)`)
  }

  return {
    audioCtx,
    source,
    analyserLeftInput,
    analyserRightInput,
    analyserLeftOutput,
    analyserRightOutput,
    sampleRate,
    init,
    start,
    stop,
    setHpfCutoff,
    setLpfCutoff,
    updateAudioRouting,
    setBoost
  }
}