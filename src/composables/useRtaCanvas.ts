import type { Ref } from "vue"
import { FrameBudgetManager } from "@/utils/performance"
import { useAudioStore } from "@/stores/audioStore"

export function useRtaCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  containerRef: Ref<HTMLDivElement | null>
) {
  const audioStore = useAudioStore()
  const frameBudget = new FrameBudgetManager(60) // Target 60 FPS for audio viz
  let lastDrawTime = 0
  const TARGET_DRAW_INTERVAL = 1000 / 60 // ~16.67ms between draws
  let animationId = 0

  function setupCanvas() {
    const canvas = canvasRef.value
    const container = containerRef.value
    if (!canvas || !container) return

    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const rect = container.getBoundingClientRect()

    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)

    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }

  function startAnimation(drawCallback: () => void) {
    function animate() {
      const currentTime = performance.now()

      // Adjust FPS based on power save mode
      const targetInterval = audioStore.powerSaveMode
        ? 1000 / 20
        : TARGET_DRAW_INTERVAL // 20 FPS in power save

      // Throttle drawing to target FPS
      if (currentTime - lastDrawTime < targetInterval) {
        animationId = requestAnimationFrame(animate)
        return
      }

      lastDrawTime = currentTime
      frameBudget.startFrame()

      drawCallback()

      // Continue animation
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
  }

  function stopAnimation() {
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = 0
    }
  }

  function handleResize() {
    setupCanvas()
  }

  return {
    setupCanvas,
    startAnimation,
    stopAnimation,
    handleResize,
  }
}
