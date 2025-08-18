export class AudioBufferPool {
  private pools: Map<number, Float32Array[]> = new Map()
  private maxPoolSize = 10

  getBuffer(size: number): Float32Array {
    const pool = this.pools.get(size) || []
    if (pool.length > 0) {
      return pool.pop()!
    }
    return new Float32Array(size)
  }

  returnBuffer(buffer: Float32Array): void {
    const size = buffer.length
    const pool = this.pools.get(size) || []
    
    if (pool.length < this.maxPoolSize) {
      // Clear buffer before returning to pool
      buffer.fill(0)
      pool.push(buffer)
      this.pools.set(size, pool)
    }
  }

  clear(): void {
    this.pools.clear()
  }
}

export const globalBufferPool = new AudioBufferPool()

export function optimizedAggregation(
  floatFreqData: Float32Array,
  previousResult: Float32Array | null,
  smoothingFactor = 0.1
): Float32Array {
  if (!previousResult) {
    return new Float32Array(floatFreqData)
  }

  // Exponential smoothing for more stable visualization
  for (let i = 0; i < floatFreqData.length; i++) {
    previousResult[i] = previousResult[i] * (1 - smoothingFactor) + 
                       floatFreqData[i] * smoothingFactor
  }

  return previousResult
}

export function detectChannelActivity(
  freqData: Float32Array,
  threshold = -60,
  minActiveCount = 5
): boolean {
  let activeCount = 0
  const linearThreshold = Math.pow(10, threshold / 20)

  for (let i = 0; i < Math.min(freqData.length, 100); i++) {
    const linear = Math.pow(10, freqData[i] / 20)
    if (linear > linearThreshold) {
      activeCount++
      if (activeCount >= minActiveCount) {
        return true
      }
    }
  }

  return false
}