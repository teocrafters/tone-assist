import { frequencyToLogX } from "@/utils/logBands"
import { useAudioStore } from "@/stores/audioStore"
import { HANDLE_WIDTH } from "@/constants/canvas"

export function useCanvasUI() {
  const audioStore = useAudioStore()

  function drawTooltip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    freq: number,
    db: number,
    canvasWidth: number,
    canvasHeight: number,
    channel?: "L" | "R"
  ) {
    // Format frequency
    const freqText =
      freq >= 1000
        ? `${(freq / 1000).toFixed(freq >= 10000 ? 0 : 1)}kHz`
        : `${Math.round(freq)}Hz`

    // Format dB
    const dbText = `${db.toFixed(1)}dB`

    // Format channel
    const channelText = channel ? ` (${channel})` : ""

    const text = `${freqText} | ${dbText}${channelText}`

    // Measure text
    const padding = 8
    ctx.font = "bold 12px monospace"
    const metrics = ctx.measureText(text)
    const boxWidth = metrics.width + padding * 2
    const boxHeight = 24

    // Position tooltip (above cursor by default)
    let boxX = x - boxWidth / 2
    let boxY = y - boxHeight - 12

    // Clamp to canvas boundaries
    boxX = Math.max(5, Math.min(canvasWidth - boxWidth - 5, boxX))
    if (boxY < 5) {
      boxY = y + 12 // Show below if not enough space above
    }

    // Draw tooltip background
    ctx.fillStyle = "rgba(0, 0, 0, 0.95)"
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight)

    // Draw tooltip border
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)

    // Draw tooltip text
    ctx.fillStyle = "#ffffff"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, boxX + boxWidth / 2, boxY + boxHeight / 2)

    // Draw vertical line at cursor position
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(x, 90) // Start below buttons
    ctx.lineTo(x, canvasHeight - 30) // End above filter labels
    ctx.stroke()
    ctx.setLineDash([])
  }

  function drawRtaModeButton(
    ctx: CanvasRenderingContext2D,
    _width: number,
    _height: number
  ) {
    const buttonWidth = 70
    const buttonHeight = 30
    const x = 10
    const y = 10

    // Button background - different colors for each mode
    if (audioStore.rtaMode === "input") {
      ctx.fillStyle = "#4CAF50" // Green for input
    } else if (audioStore.rtaMode === "output") {
      ctx.fillStyle = "#2196F3" // Blue for output
    } else {
      // both
      ctx.fillStyle = "#FF9800" // Orange for both
    }

    ctx.fillRect(x, y, buttonWidth, buttonHeight)

    // Button border
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, buttonWidth, buttonHeight)

    // Button text
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 10px monospace"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    const text =
      audioStore.rtaMode === "both" ? "BOTH" : audioStore.rtaMode.toUpperCase()
    ctx.fillText(text, x + buttonWidth / 2, y + buttonHeight / 2)
  }

  function drawFixedDistanceButton(
    ctx: CanvasRenderingContext2D,
    _width: number,
    _height: number
  ) {
    const buttonWidth = 85
    const buttonHeight = 30
    const x = 90 // Right next to RTA mode button
    const y = 10

    // Button background
    ctx.fillStyle = audioStore.fixedDistanceEnabled ? "#FF9800" : "#666666"
    ctx.fillRect(x, y, buttonWidth, buttonHeight)

    // Button border
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, buttonWidth, buttonHeight)

    // Button text
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 10px monospace"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    const text = audioStore.fixedDistanceEnabled ? "FIXED ON" : "FIXED OFF"
    ctx.fillText(text, x + buttonWidth / 2, y + buttonHeight / 2)
  }

  function drawBoostButton(
    ctx: CanvasRenderingContext2D,
    width: number,
    _height: number
  ) {
    const buttonWidth = 60
    const buttonHeight = 30
    const x = width - buttonWidth - 10
    const y = 50 // Below mode indicator

    // Button background
    ctx.fillStyle = audioStore.boostEnabled ? "#ff4444" : "#444444"
    ctx.fillRect(x, y, buttonWidth, buttonHeight)

    // Button border
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, buttonWidth, buttonHeight)

    // Button text
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 12px monospace"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("+20dB", x + buttonWidth / 2, y + buttonHeight / 2)
  }

  function drawFilterOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    const hpfX = frequencyToLogX(audioStore.hpfCutoff, 20, 20000, width)
    const lpfX = frequencyToLogX(audioStore.lpfCutoff, 20, 20000, width)

    // Draw filtered-out areas
    ctx.fillStyle = "rgba(255, 0, 0, 0.2)"
    ctx.fillRect(0, 0, hpfX, height) // Below HPF
    ctx.fillRect(lpfX, 0, width - lpfX, height) // Above LPF

    // Draw filter lines
    ctx.strokeStyle = "#ff4444"
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])

    // HPF line
    ctx.beginPath()
    ctx.moveTo(hpfX, 0)
    ctx.lineTo(hpfX, height)
    ctx.stroke()

    // LPF line
    ctx.beginPath()
    ctx.moveTo(lpfX, 0)
    ctx.lineTo(lpfX, height)
    ctx.stroke()

    ctx.setLineDash([])

    // Draw frequency labels - mobile-friendly positioning with smart collision avoidance
    ctx.font = "bold 16px monospace" // Larger, bold font for mobile
    ctx.textBaseline = "top"

    const hpfLabel = `${Math.round(audioStore.hpfCutoff)}Hz`
    const lpfLabel = `${Math.round(audioStore.lpfCutoff)}Hz`

    const labelY = 100 // Fixed position at top, below buttons
    const padding = 6
    const minGap = 20 // Minimum gap between labels

    // Measure label dimensions
    const hpfMetrics = ctx.measureText(hpfLabel)
    const lpfMetrics = ctx.measureText(lpfLabel)
    const hpfWidth = hpfMetrics.width + padding * 2
    const lpfWidth = lpfMetrics.width + padding * 2

    // Ensure HPF is always on the left, LPF on the right
    const leftX = Math.min(hpfX, lpfX)
    const rightX = Math.max(hpfX, lpfX)
    const isHpfLeft = hpfX < lpfX

    // Calculate distance between filter lines
    const filterDistance = rightX - leftX
    const totalLabelsWidth = hpfWidth + lpfWidth + minGap

    let leftLabelX: number
    let rightLabelX: number

    // Smart positioning based on available space
    if (filterDistance >= totalLabelsWidth + 40) {
      // Extra space buffer
      // Plenty of space - position labels next to their respective lines
      leftLabelX = leftX + 15
      rightLabelX = rightX - 15
    } else {
      // Not enough space - push labels outward from center
      const centerPoint = (leftX + rightX) / 2
      const halfSpace = totalLabelsWidth / 2

      leftLabelX = Math.max(10, centerPoint - halfSpace)
      rightLabelX = Math.min(width - 10, centerPoint + halfSpace)

      // Ensure minimum distance from screen edges
      if (leftLabelX + hpfWidth + minGap + lpfWidth > rightLabelX) {
        // Still not enough space, force to edges
        leftLabelX = 10
        rightLabelX = width - 10
      }
    }

    // Assign positions based on which filter is where
    const finalHpfX = isHpfLeft ? leftLabelX : rightLabelX
    const finalLpfX = isHpfLeft ? rightLabelX : leftLabelX

    // Draw HPF label background and text
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
    if (isHpfLeft) {
      ctx.fillRect(
        finalHpfX - padding,
        labelY - padding,
        hpfWidth,
        20 + padding
      )
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "left"
      ctx.fillText(hpfLabel, finalHpfX, labelY)
    } else {
      ctx.fillRect(
        finalHpfX - hpfWidth + padding,
        labelY - padding,
        hpfWidth,
        20 + padding
      )
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "right"
      ctx.fillText(hpfLabel, finalHpfX, labelY)
    }

    // Draw LPF label background and text
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
    if (isHpfLeft) {
      ctx.fillRect(
        finalLpfX - lpfWidth + padding,
        labelY - padding,
        lpfWidth,
        20 + padding
      )
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "right"
      ctx.fillText(lpfLabel, finalLpfX, labelY)
    } else {
      ctx.fillRect(
        finalLpfX - padding,
        labelY - padding,
        lpfWidth,
        20 + padding
      )
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "left"
      ctx.fillText(lpfLabel, finalLpfX, labelY)
    }

    // Draw draggable handles
    ctx.fillStyle = "#ff4444"
    const handleHeight = 30
    const effectiveMode = audioStore.getEffectiveChannelMode()

    if (effectiveMode === "stereo") {
      // Draw handles for both channels
      const topHandleY = height / 4 - handleHeight / 2
      const bottomHandleY = (3 * height) / 4 - handleHeight / 2

      // HPF handles
      ctx.fillRect(
        hpfX - HANDLE_WIDTH / 2,
        topHandleY,
        HANDLE_WIDTH,
        handleHeight
      )
      ctx.fillRect(
        hpfX - HANDLE_WIDTH / 2,
        bottomHandleY,
        HANDLE_WIDTH,
        handleHeight
      )

      // LPF handles
      ctx.fillRect(
        lpfX - HANDLE_WIDTH / 2,
        topHandleY,
        HANDLE_WIDTH,
        handleHeight
      )
      ctx.fillRect(
        lpfX - HANDLE_WIDTH / 2,
        bottomHandleY,
        HANDLE_WIDTH,
        handleHeight
      )
    } else {
      // Draw single handles for mono
      const handleY = height / 2 - handleHeight / 2

      // HPF handle
      ctx.fillRect(hpfX - HANDLE_WIDTH / 2, handleY, HANDLE_WIDTH, handleHeight)

      // LPF handle
      ctx.fillRect(lpfX - HANDLE_WIDTH / 2, handleY, HANDLE_WIDTH, handleHeight)
    }
  }

  return {
    drawTooltip,
    drawRtaModeButton,
    drawFixedDistanceButton,
    drawBoostButton,
    drawFilterOverlay,
  }
}
