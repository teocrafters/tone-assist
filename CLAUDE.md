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

- **48dB/octave Filters**: Implemented as 4× cascaded `BiquadFilterNodes`
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
- **Audio cleanup**: Always clean up `AudioNodes` to prevent memory leaks

#### Naming Conventions

- **camelCase**: Variables and function names (`myVariable`, `myFunction()`)
- **PascalCase**: Classes, types, and interfaces (`MyClass`, `MyInterface`)
- **ALL_CAPS**: Constants and enum values (`MAX_FREQUENCY`, `BUFFER_SIZE`)
- **kebab-case**: File and directory names
- **Generic types**: Prefix with `T` (`TKey`, `TValue`, `TData`, `TError`)
- **Abbreviations**: Use "URL" (not "Url"), "API" (not "Api"), "ID" (not "Id")

#### Import Organization

- **Order**: Type-only imports first, Vue-related, external libraries, internal
  utilities
- **Type imports**: Always use `type` keyword for type-only imports
- **Grouping**: Separate import groups with blank lines

#### Code Quality Standards

- **Function length**: Keep functions under 20 lines for readability
- **Line length**: Maintain 100 character limit
- **Early returns**: Use early returns to avoid deeply nested blocks
- **Functional patterns**: Prefer pure functions when possible
- **RO-RO pattern**: Use Receive Object, Return Object for multiple parameters
- **Immutability**: Use `readonly` for immutable properties, `as const` for
  literals

#### Error Handling

- **Result types**: Use Result types instead of throwing for library code
- **Boundary validation**: Validate inputs at function boundaries
- **Meaningful errors**: Provide clear error messages with context
- **Async patterns**: Always handle errors in async operations

#### Anchor Comments System

Use specially formatted comments for inline knowledge that can be easily
searched:

- **Format**: `AGENT-NOTE:`, `AGENT-TODO:`, or `AGENT-QUESTION:` (all-caps
  prefix)
- **Length**: Keep concise (≤ 120 characters)
- **Maintenance**: Update relevant anchors when modifying associated code
- **Search first**: Always check for existing `AGENT-*` anchors before changes
- **Preservation**: Do not remove `AGENT-NOTE`s without explicit instruction

```typescript
// AGENT-NOTE: Performance-critical audio processing; avoid allocations in loop
function processAudioData(inputData: Float32Array): Float32Array {
  // Implementation
}

// AGENT-TODO: Add support for 96kHz sample rates
const SUPPORTED_SAMPLE_RATES = [44100, 48000] as const

// AGENT-QUESTION: Should we cache filter coefficients or recalculate?
function updateFilterFrequency(frequency: number): void {
  // Implementation
}
```

#### Documentation Standards

- **Comments**: Use ONLY for architectural decisions, not code explanation
- **Self-documenting**: Use descriptive function and variable names
- **No JSDoc**: Avoid JSDoc for internal TypeScript types (types are
  self-documenting)
- **Separation**: Use blank lines to separate logical sections, not comments

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
- **Memory efficient**: Reuse typed arrays (`Float32Array`) for FFT data
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

**Mandatory workflow before every commit:**

```bash
# Run all quality checks
pnpm lint && pnpm test && pnpm build

# Or use the comprehensive check script
pnpm ci  # If available
```

**Quality Gates:**

- **ESLint**: Code quality and Vue/TypeScript rules
- **Prettier**: Consistent formatting
- **Tests**: Unit tests must pass
- **Build**: Production build must succeed
- **Audio cleanup**: Verify `AudioNode` disconnections
- **Performance**: Check for memory leaks in audio processing
- **Error handling**: Ensure proper error handling in audio initialization

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
- **iOS Safari**: Additional restrictions on `AudioContext` creation

### Canvas Performance

- **Avoid frequent `getImageData()`**: Use efficient drawing patterns
- **Batch drawing operations**: Minimize context state changes
- **Use appropriate data structures**: `Float32Array` for audio data

### Browser Compatibility

- **Chromium**: Best Web Audio API support
- **Safari**: PWA installation, some AudioWorklet limitations
- **Firefox**: Good compatibility, occasional timing differences

## Common Pitfalls

### Development Issues

- **AudioContext state**: Forgetting to resume `AudioContext` after user gesture
- **Memory leaks**: Not disconnecting `AudioNodes` on component unmount
- **Canvas performance**: Creating new objects inside render loops
- **Sample rate assumptions**: Hardcoding sample rates instead of using
  `audioContext.sampleRate`
- **Filter stability**: Not handling filter coefficient edge cases (frequency =
  0 or Nyquist)
- **Browser compatibility**: Assuming all Web Audio API features work across
  browsers

### Code Quality Issues

- **Large commits**: Making large refactors in single commit instead of granular
  changes
- **Missing tests**: Writing audio features without proper testing (mocked or
  real)
- **Hardcoded values**: Using magic numbers for audio parameters instead of
  constants
- **Poor error handling**: Not handling microphone access denials gracefully
- **Race conditions**: Not properly handling async audio initialization

### TypeScript Issues

- **Any usage**: Using `any` type instead of proper Web Audio API types
- **Missing types**: Not typing audio processing functions properly
- **Unsafe assertions**: Using non-null assertions without proper checks

### Audio-Specific Issues

- **FFT window**: Not considering window functions for spectral analysis
- **Aliasing**: Not accounting for Nyquist frequency in filter design
- **Latency**: Not optimizing audio buffer sizes for real-time processing
- **Clipping**: Not monitoring signal levels to prevent distortion

## Files to NOT Modify

These files should NEVER be modified without explicit permission:

- `.gitignore` and related ignore files
- Lock files (`pnpm-lock.yaml`)
- Generated type definitions (`.d.ts` files)
- Core configuration files (`vite.config.ts`, `tsconfig.json`)
- PWA manifest and service worker files (unless feature requires)

Remember: This is a real-time audio application requiring careful attention to
performance, memory management, and audio processing accuracy. Always test audio
features with actual hardware and real-world audio sources.
