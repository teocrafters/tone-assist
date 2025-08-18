export interface LogBandEdge {
  fLow: number
  fHigh: number
  fCenter: number
}

export function makeLogBands(fMin = 20, fMax = 20000, bands = 120): LogBandEdge[] {
  const edges: LogBandEdge[] = []
  const ratio = fMax / fMin
  
  for (let i = 0; i < bands; i++) {
    const a = i / bands
    const b = (i + 1) / bands
    const fLow = fMin * Math.pow(ratio, a)
    const fHigh = fMin * Math.pow(ratio, b)
    const fCenter = Math.sqrt(fLow * fHigh) // Geometric mean for center frequency
    
    edges.push({ fLow, fHigh, fCenter })
  }
  
  return edges
}

export function freqToBin(freq: number, sampleRate: number, fftSize: number): number {
  const N = fftSize / 2
  const bin = Math.floor((freq / sampleRate) * fftSize)
  return Math.max(0, Math.min(N - 1, bin))
}

export function binToFreq(bin: number, sampleRate: number, fftSize: number): number {
  return (bin * sampleRate) / fftSize
}

export function aggregateBands(
  floatFreqData: Float32Array,
  sampleRate: number,
  fftSize: number,
  bands: LogBandEdge[],
  reducer: 'mean' | 'max' | 'rms' = 'mean'
): Float32Array {
  const result = new Float32Array(bands.length)
  
  for (let i = 0; i < bands.length; i++) {
    const { fLow, fHigh } = bands[i]
    const k0 = freqToBin(fLow, sampleRate, fftSize)
    const k1 = Math.max(k0 + 1, freqToBin(fHigh, sampleRate, fftSize))
    
    let value = -120 // Default very low value in dB
    
    if (k1 > k0) {
      switch (reducer) {
        case 'mean': {
          let sum = 0
          for (let k = k0; k < k1; k++) {
            sum += floatFreqData[k]
          }
          value = sum / (k1 - k0)
          break
        }
        case 'max': {
          let max = -Infinity
          for (let k = k0; k < k1; k++) {
            if (floatFreqData[k] > max) {
              max = floatFreqData[k]
            }
          }
          value = max
          break
        }
        case 'rms': {
          let sumSquares = 0
          for (let k = k0; k < k1; k++) {
            // Convert dB to linear, square it, then back to dB
            const linear = Math.pow(10, floatFreqData[k] / 20)
            sumSquares += linear * linear
          }
          const rms = Math.sqrt(sumSquares / (k1 - k0))
          value = 20 * Math.log10(Math.max(1e-10, rms))
          break
        }
      }
    }
    
    // Clamp to reasonable dB range
    result[i] = Math.max(-100, Math.min(0, value))
  }
  
  return result
}

export function frequencyToLogX(frequency: number, fMin: number, fMax: number, width: number): number {
  const logMin = Math.log10(fMin)
  const logMax = Math.log10(fMax)
  const logFreq = Math.log10(Math.max(fMin, Math.min(fMax, frequency)))
  return ((logFreq - logMin) / (logMax - logMin)) * width
}

export function logXToFrequency(x: number, fMin: number, fMax: number, width: number): number {
  const logMin = Math.log10(fMin)
  const logMax = Math.log10(fMax)
  const ratio = x / width
  const logFreq = logMin + ratio * (logMax - logMin)
  return Math.pow(10, logFreq)
}

export function snapToGrid(frequency: number, octaveFraction = 24): number {
  // Snap to 1/24 octave grid (semitones)
  const referenceFreq = 1000 // 1kHz reference
  const octaves = Math.log2(frequency / referenceFreq)
  const steps = Math.round(octaves * octaveFraction)
  return referenceFreq * Math.pow(2, steps / octaveFraction)
}