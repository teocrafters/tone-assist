let lastFrameTime = performance.now()
let frameCount = 0
let fps = 60

export function getFPS(): number {
  return fps
}

export function updateFPS(): void {
  frameCount++
  const currentTime = performance.now()
  const deltaTime = currentTime - lastFrameTime

  if (deltaTime >= 1000) {
    // Calculate FPS every second
    fps = Math.round((frameCount * 1000) / deltaTime)
    frameCount = 0
    lastFrameTime = currentTime
  }
}

export function shouldSkipFrame(targetFPS = 30): boolean {
  return fps > targetFPS * 1.5 // Skip frames if running significantly above target
}

export class FrameBudgetManager {
  private frameStartTime = 0
  private readonly targetFrameTime: number

  constructor(targetFPS = 60) {
    this.targetFrameTime = 1000 / targetFPS // milliseconds per frame
  }

  startFrame(): void {
    this.frameStartTime = performance.now()
  }

  hasTimeBudget(minRemainingMs = 2): boolean {
    const elapsed = performance.now() - this.frameStartTime
    return elapsed < this.targetFrameTime - minRemainingMs
  }

  getElapsedTime(): number {
    return performance.now() - this.frameStartTime
  }
}
