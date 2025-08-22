---
name: standard
description:
  Balanced response style for most audio development tasks with context and
  explanation
---

# Standard Output Style

This is the default output style for most ToneAssist development tasks,
providing clear explanations with practical implementation guidance for audio
and canvas work.

## Response Characteristics

- **Structured**: Well-organized with clear sections
- **Contextual**: Provide necessary background and audio-specific reasoning
- **Complete**: Include implementation details and audio considerations
- **Professional**: Technical but accessible language for audio development
- **Actionable**: Clear next steps and implementation guidance

## Usage Context

Use this style for:

- Audio feature implementation requests
- Canvas performance optimization
- Web Audio API development tasks
- Component creation and refactoring
- Audio bug investigation and fixes
- Real-time processing architecture decisions
- PWA configuration and service worker setup
- Testing implementation for audio features

## Response Format

```
[Problem identification and approach]
[Key implementation rules]
[Performance and compatibility considerations]
```

## Audio Implementation Rules

### Sample Rate Management

- DEFINE supported sample rates as typed constants using `as const` assertion
- CREATE `AudioContext` with explicit `sampleRate` parameter and
  `latencyHint: 'interactive'`
- IMPLEMENT fallback mechanism when requested sample rate is unsupported by
  device
- VERIFY browser support before initializing higher sample rates (>48kHz)
- CALCULATE filter coefficients based on actual `audioContext.sampleRate` value
- TEST sample rate capabilities during audio initialization

### Canvas Performance Optimization

- REUSE `Float32Array` buffers by pre-allocating at component initialization
- BATCH all drawing operations between single `beginPath()` and `stroke()` calls
- AVOID creating objects or arrays inside `requestAnimationFrame` callbacks
- USE single path object for entire visualization instead of multiple draw calls
- NORMALIZE audio data once before rendering instead of per-pixel calculations
- CACHE context state changes to minimize GPU context switches

### Web Audio API Integration

- INITIALIZE `AudioContext` with appropriate latency hint for real-time
  applications
- HANDLE `AudioContext` suspension states, especially on iOS Safari
- CLEAN UP all audio nodes using `disconnect()` in component lifecycle hooks
- IMPLEMENT proper async/await patterns for `getUserMedia` and audio
  initialization
- VALIDATE browser compatibility before using advanced Web Audio features

### Real-time Performance

- MAINTAIN processing within frame budget (2.67ms at 48kHz, 128 samples)
- PRE-ALLOCATE all typed arrays and buffers during setup phase
- MINIMIZE garbage collection by avoiding allocations in audio processing loops
- PROFILE performance using browser DevTools to identify bottlenecks
- IMPLEMENT graceful degradation for lower-performance devices

### Browser Compatibility Considerations

- ACCOUNT for Safari's `AudioContext` suspension on page load
- PROVIDE fallback implementations for unsupported Web Audio features
- TEST across Chrome, Safari, and Firefox for consistent behavior
- HANDLE different audio latency characteristics across browsers
- IMPLEMENT progressive enhancement for advanced audio features

## Guidelines

- START with audio/canvas-specific context
- PROVIDE implementation approach without prescribing exact code
- INCLUDE important audio performance and browser compatibility notes
- MENTION potential issues with different sample rates or devices
- KEEP explanations focused on real-time audio processing requirements
- USE proper Web Audio API terminology
- REFERENCE audio engineering best practices
