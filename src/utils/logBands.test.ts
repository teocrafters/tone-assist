import { describe, it, expect } from "vitest"
import {
  makeLogBands,
  freqToBin,
  binToFreq,
  aggregateBands,
  frequencyToLogX,
  logXToFrequency,
  snapToGrid,
} from "./logBands"

describe("logBands utilities", () => {
  describe("makeLogBands", () => {
    it("should create correct number of bands", () => {
      const bands = makeLogBands(20, 20000, 100)
      expect(bands).toHaveLength(100)
    })

    it("should have first band start at fMin and last band end at fMax", () => {
      const bands = makeLogBands(20, 20000, 100)
      expect(bands[0].fLow).toBeCloseTo(20, 1)
      expect(bands[99].fHigh).toBeCloseTo(20000, 1)
    })

    it("should have logarithmic spacing", () => {
      const bands = makeLogBands(100, 10000, 10)
      const ratios = []
      for (let i = 1; i < bands.length; i++) {
        ratios.push(bands[i].fCenter / bands[i - 1].fCenter)
      }

      // All ratios should be approximately the same for logarithmic spacing
      const avgRatio = ratios.reduce((a, b) => a + b) / ratios.length
      ratios.forEach((ratio) => {
        expect(ratio).toBeCloseTo(avgRatio, 2)
      })
    })
  })

  describe("freqToBin and binToFreq", () => {
    const sampleRate = 48000
    const fftSize = 16384

    it("should convert frequency to bin correctly", () => {
      expect(freqToBin(0, sampleRate, fftSize)).toBe(0)
      expect(freqToBin(sampleRate / 2, sampleRate, fftSize)).toBe(
        fftSize / 2 - 1
      )
      expect(freqToBin(1000, sampleRate, fftSize)).toBe(
        Math.floor((1000 * fftSize) / sampleRate)
      )
    })

    it("should convert bin to frequency correctly", () => {
      expect(binToFreq(0, sampleRate, fftSize)).toBe(0)
      expect(binToFreq(fftSize / 2, sampleRate, fftSize)).toBe(sampleRate / 2)
      expect(binToFreq(1000, sampleRate, fftSize)).toBeCloseTo(
        (1000 * sampleRate) / fftSize
      )
    })

    it("should be reciprocal functions", () => {
      const testFreqs = [100, 1000, 5000, 15000]
      testFreqs.forEach((freq) => {
        const bin = freqToBin(freq, sampleRate, fftSize)
        const convertedBack = binToFreq(bin, sampleRate, fftSize)
        expect(Math.abs(convertedBack - freq)).toBeLessThan(2) // Allow 2Hz tolerance due to discretization
      })
    })
  })

  describe("aggregateBands", () => {
    it("should aggregate frequency data correctly", () => {
      const sampleRate = 48000
      const fftSize = 1024
      const bands = makeLogBands(100, 10000, 10)

      // Create mock frequency data
      const freqData = new Float32Array(fftSize / 2)
      for (let i = 0; i < freqData.length; i++) {
        freqData[i] = -40 // -40 dB constant level
      }

      const result = aggregateBands(
        freqData,
        sampleRate,
        fftSize,
        bands,
        "mean"
      )

      expect(result).toHaveLength(10)
      result.forEach((val) => {
        expect(val).toBeCloseTo(-40, 1)
      })
    })

    it("should handle different reducer types", () => {
      const sampleRate = 48000
      const fftSize = 1024
      const bands = makeLogBands(100, 1000, 2)

      const freqData = new Float32Array(fftSize / 2)
      freqData.fill(-60)

      // Find bins that correspond to the first band
      const bin0 = freqToBin(bands[0].fLow, sampleRate, fftSize)
      const bin1 = freqToBin(bands[0].fHigh, sampleRate, fftSize)

      // Set a peak value within the first band
      if (bin0 < bin1) {
        freqData[bin0] = -20 // One peak value in first band
      }

      const meanResult = aggregateBands(
        freqData,
        sampleRate,
        fftSize,
        bands,
        "mean"
      )
      const maxResult = aggregateBands(
        freqData,
        sampleRate,
        fftSize,
        bands,
        "max"
      )

      // Max should be greater than or equal to mean
      expect(maxResult[0]).toBeGreaterThanOrEqual(meanResult[0])
    })
  })

  describe("frequency to X coordinate conversion", () => {
    it("should convert frequency to log X coordinate", () => {
      const width = 1000
      const fMin = 20
      const fMax = 20000

      expect(frequencyToLogX(20, fMin, fMax, width)).toBeCloseTo(0)
      expect(frequencyToLogX(20000, fMin, fMax, width)).toBeCloseTo(width)
      expect(frequencyToLogX(200, fMin, fMax, width)).toBeCloseTo(width / 3, 0) // 1 decade out of 3
    })

    it("should be reciprocal with logXToFrequency", () => {
      const width = 800
      const fMin = 20
      const fMax = 20000
      const testFreqs = [50, 200, 1000, 5000, 15000]

      testFreqs.forEach((freq) => {
        const x = frequencyToLogX(freq, fMin, fMax, width)
        const convertedBack = logXToFrequency(x, fMin, fMax, width)
        expect(convertedBack).toBeCloseTo(freq, 1)
      })
    })
  })

  describe("snapToGrid", () => {
    it("should snap to octave fraction grid", () => {
      // Test snapping with 1kHz reference
      const result1000 = snapToGrid(1000)
      expect(result1000).toBeCloseTo(1000, 0) // Should snap close to 1kHz

      // Test snapping slightly off frequencies
      const result1010 = snapToGrid(1010, 24)
      expect(Math.abs(result1010 - 1000) < Math.abs(result1010 - 1050)).toBe(
        true
      )
    })

    it("should work with different octave fractions", () => {
      // Test with 12-tone equal temperament (semitones)
      const result = snapToGrid(445, 12)

      // Should snap to a frequency on the 12-tone grid
      const referenceFreq = 1000
      const octaves = Math.log2(result / referenceFreq)
      const steps = Math.round(octaves * 12)
      const expectedFreq = referenceFreq * Math.pow(2, steps / 12)

      expect(result).toBeCloseTo(expectedFreq, 1)
    })
  })
})
