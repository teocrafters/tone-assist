# Claude Code Instructions for RTA Project

## Project Overview

RTA (Real-Time Audio Analyzer) is a Progressive Web App for professional audio
analysis built with Vue 3, TypeScript, and the Web Audio API. The application
provides real-time spectral analysis with interactive HPF/LPF filters and stereo
channel support.

## Tech Stack & Architecture

### Core Technologies

- **Vue 3** with Composition API (`<script setup>` syntax)
- **TypeScript** (strict mode enabled)
- **Vite** for build tooling and development server
- **Pinia** for state management
- **Web Audio API** for audio processing
- **Canvas 2D** for real-time visualization
- **PWA** with service worker (Workbox)

### Key Architectural Concepts

#### Audio Processing Graph

```
Microphone → ChannelSplitter → [HPF₁→HPF₂→HPF₃→HPF₄] → [LPF₁→LPF₂→LPF₃→LPF₄] → GainNode → AnalyserNode → Visualization
                             ↓
                        ChannelMerger → AudioDestination
```

- **48dB/octave Filters**: Implemented as 4× cascaded BiquadFilterNodes
- **Dual Analyzer Sets**: Separate analyzers for input (pre-filter) and output
  (post-filter)
- **Dynamic Routing**: Smart mono→stereo duplication and stereo L/R separation

#### Core Files Structure

```
src/
├── components/
│   └── RtaCanvas.vue           # Main canvas visualization and UI
├── composables/
│   ├── useAudioGraph.ts        # Core Web Audio API logic
│   └── useSilenceDetector.ts   # Channel activity detection
├── stores/
│   └── audioStore.ts           # Global audio state (Pinia)
├── utils/
│   └── logBands.ts             # Frequency band aggregation
└── App.vue                     # Root component
```

## Development Guidelines

### Code Style & Conventions

- **Always use pnpm** for package management
- **TypeScript strict mode**: All types must be explicit
- **Vue Composition API**: Use `<script setup>` syntax exclusively
- **Reactive patterns**: Prefer `ref()` and `computed()` over options API
- **Audio cleanup**: Always clean up AudioNodes to prevent memory leaks

### Web Audio API Patterns

```typescript
// Correct pattern for filter cascading
const createCascadedFilter = (
  audioContext: AudioContext,
  type: BiquadFilterType,
  frequency: number
) => {
  const filters = Array.from({ length: 4 }, () =>
    audioContext.createBiquadFilter()
  )
  filters.forEach((filter) => {
    filter.type = type
    filter.frequency.value = frequency
    filter.Q.value = 0.707 // Butterworth response
  })
  // Connect in series: input → f1 → f2 → f3 → f4 → output
  filters.reduce((prev, current) => (prev.connect(current), current))
  return { input: filters[0], output: filters[3], filters }
}
```

### Canvas Rendering Guidelines

- **60fps target**: Use `requestAnimationFrame` for smooth animation
- **HiDPI support**: Always account for `devicePixelRatio`
- **Memory efficient**: Reuse typed arrays (Float32Array) for FFT data
- **Event handling**: Use pointer events for cross-platform touch/mouse support

### State Management (Pinia)

- **Audio state**: Centralized in `audioStore.ts`
- **Reactive properties**: Filter frequencies, boost state, channel modes
- **Actions**: Pure functions that update state and trigger audio graph changes
- **Getters**: Computed properties for derived state (e.g., effective channel
  mode)

## Common Tasks & Patterns

### Adding New Audio Features

1. **Update audio graph** in `useAudioGraph.ts`
2. **Add state management** in `audioStore.ts`
3. **Update UI controls** in `RtaCanvas.vue`
4. **Add tests** for utility functions in `__tests__/`

### Audio Node Management

```typescript
// Always clean up audio nodes
const cleanup = () => {
  analyserNode?.disconnect()
  filterNodes.forEach((node) => node.disconnect())
  gainNode?.disconnect()
}

onUnmounted(() => {
  cleanup()
  if (audioContext?.state !== "closed") {
    audioContext.close()
  }
})
```

### Canvas Event Handling

```typescript
// Cross-platform pointer events
function onPointerMove(event: PointerEvent) {
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // Always check bounds
  if (x < 0 || x > rect.width || y < 0 || y > rect.height) return

  // Handle interaction
}
```

## Git Workflow & Conventions

### Commit Message Format (Conventional Commits)

```
type(scope): description

Examples:
feat(audio): add stereo channel detection
fix(ui): resolve tooltip positioning on mobile
docs(readme): update API documentation
refactor(filters): optimize cascaded filter creation
test(utils): add frequency band aggregation tests
chore(deps): update Vue to latest version
```

### Branch Naming

- `feat/feature-name` - New features
- `fix/issue-description` - Bug fixes
- `docs/documentation-update` - Documentation
- `refactor/code-improvement` - Code refactoring

### Pre-commit Checks

- **ESLint**: Code quality and Vue/TypeScript rules
- **Prettier**: Consistent formatting
- **Tests**: Unit tests must pass
- **Build**: Production build must succeed

## Testing Strategy

### Unit Tests (Vitest)

- **Utilities**: Test frequency calculations, band aggregations
- **Pure functions**: Test audio parameter calculations
- **State management**: Test Pinia store actions and getters

### Integration Tests

- **Audio graph**: Test Web Audio API node connections
- **Canvas**: Test rendering functions with mock context
- **User interactions**: Test filter dragging and button clicks

### Performance Tests

- **Memory leaks**: Monitor AudioNode cleanup
- **Frame rate**: Ensure 60fps canvas rendering
- **Audio latency**: Measure end-to-end audio processing time

## Deployment & Build

### Environment Requirements

- **Node.js**: 18+ for optimal Vite performance
- **pnpm**: Package manager (never use npm/yarn)
- **HTTPS**: Required for getUserMedia in production

### Build Configuration

- **Target**: ES2022 for modern browser features
- **Chunks**: Code splitting for optimal loading
- **PWA**: Service worker with precaching strategy
- **Assets**: Optimize images and audio samples

### Performance Monitoring

- **Bundle analysis**: Monitor chunk sizes
- **Runtime performance**: Canvas rendering metrics
- **Memory usage**: AudioNode lifecycle tracking
- **Audio metrics**: Latency and dropout monitoring

## Common Issues & Solutions

### Web Audio API Gotchas

- **AudioContext state**: Must be resumed after user gesture
- **Sample rate**: Different devices may have different rates
- **Buffer sizes**: May vary between browsers/devices
- **iOS Safari**: Additional restrictions on AudioContext creation

### Canvas Performance

- **Avoid frequent getImageData()**: Use efficient drawing patterns
- **Batch drawing operations**: Minimize context state changes
- **Use appropriate data structures**: Float32Array for audio data

### Browser Compatibility

- **Chromium**: Best Web Audio API support
- **Safari**: PWA installation, some AudioWorklet limitations
- **Firefox**: Good compatibility, occasional timing differences

Remember: This is a real-time audio application requiring careful attention to
performance, memory management, and audio processing accuracy. Always test audio
features with actual hardware and real-world audio sources.
