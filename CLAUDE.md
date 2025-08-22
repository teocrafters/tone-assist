# Claude Code Instructions for RTA Project

## Project Overview

RTA (Real-Time Audio Analyzer) is a Progressive Web App for professional audio
analysis built with `Vue 3`, `TypeScript`, and the `Web Audio API`. The
application provides real-time spectral analysis with interactive HPF/LPF
filters and stereo channel support.

## Tech Stack & Architecture

### Core Technologies

- USE `Vue 3` with Composition API (`<script setup>` syntax)
- ENABLE `TypeScript` strict mode for all types
- CONFIGURE `Vite` for build tooling and development server
- IMPLEMENT `Pinia` for state management
- UTILIZE `Web Audio API` for audio processing
- RENDER with `Canvas 2D` for real-time visualization
- DEPLOY as `PWA` with service worker (`Workbox`)

### Key Architectural Concepts

#### Audio Processing Graph

```
Microphone → `ChannelSplitter` → [HPF₁→HPF₂→HPF₃→HPF₄] → [LPF₁→LPF₂→LPF₃→LPF₄] → `GainNode` → `AnalyserNode` → Visualization
                             ↓
                        ChannelMerger → AudioDestination
```

- CREATE 48dB/octave filters using 4× cascaded `BiquadFilterNodes`
- IMPLEMENT dual analyzer sets with separate analyzers for input (pre-filter)
  and output (post-filter)
- CONFIGURE dynamic routing with smart mono→stereo duplication and stereo L/R
  separation

#### Core Files Structure

```
src/
├── components/
│   └── `RtaCanvas.vue`           # Main canvas visualization and UI
├── composables/
│   ├── useAudioGraph.ts        # Core Web Audio API logic
│   └── useSilenceDetector.ts   # Channel activity detection
├── stores/
│   └── `audioStore.ts`           # Global audio state (`Pinia`)
├── utils/
│   └── logBands.ts             # Frequency band aggregation
└── App.vue                     # Root component
```

## Development Guidelines

### Code Style & Conventions

- USE `pnpm` exclusively for package management
- ENFORCE `TypeScript` strict mode with explicit types
- WRITE components with `Vue Composition API` using `<script setup>` syntax
  exclusively
- PREFER reactive patterns with `ref()` and `computed()` over options API
- CLEAN UP `AudioNodes` to prevent memory leaks

#### Naming Conventions

- USE camelCase for variables and function names (`myVariable`, `myFunction()`)
- USE PascalCase for classes, types, and interfaces (`MyClass`, `MyInterface`)
- USE ALL_CAPS for constants and enum values (`MAX_FREQUENCY`, `BUFFER_SIZE`)
- USE kebab-case for file and directory names
- PREFIX generic types with `T` (`TKey`, `TValue`, `TData`, `TError`)
- USE proper abbreviations: "URL" (not "Url"), "API" (not "Api"), "ID" (not
  "Id")

#### Import Organization

- ORDER imports: type-only imports first, `Vue`-related, external libraries,
  internal utilities
- USE `type` keyword for type-only imports
- SEPARATE import groups with blank lines

#### Code Quality Standards

- KEEP functions under 20 lines for readability
- MAINTAIN 100 character line length limit
- USE early returns to avoid deeply nested blocks
- PREFER pure functions when possible
- IMPLEMENT RO-RO pattern: Receive Object, Return Object for multiple parameters
- USE `readonly` for immutable properties, `as const` for literals

#### Error Handling

- USE Result types instead of throwing for library code
- VALIDATE inputs at function boundaries
- PROVIDE clear error messages with context
- HANDLE errors in async operations

#### Anchor Comments System

Use specially formatted comments for inline knowledge that can be easily
searched:

- FORMAT anchor comments with `AGENT-NOTE:`, `AGENT-TODO:`, or `AGENT-QUESTION:`
  (all-caps prefix)
- KEEP anchor comments concise (≤ 120 characters)
- UPDATE relevant anchors when modifying associated code
- SEARCH for existing `AGENT-*` anchors before making changes
- PRESERVE `AGENT-NOTE`s without explicit instruction to remove

- PLACE `AGENT-NOTE:` before performance-critical audio processing sections to
  warn about allocation restrictions
- ADD `AGENT-TODO:` for planned audio features like additional sample rate
  support
- INSERT `AGENT-QUESTION:` when architectural decisions need clarification
  (e.g., filter coefficient caching strategies)

#### Documentation Standards

- USE comments ONLY for architectural decisions, not code explanation
- WRITE descriptive function and variable names for self-documenting code
- AVOID JSDoc for internal `TypeScript` types (types are self-documenting)
- SEPARATE logical sections with blank lines, not comments

### Web Audio API Patterns

### Filter Cascading Patterns

- CREATE 4 `BiquadFilterNode` instances using `Array.from()` for consistent
  filter count
- SET each filter's `type`, `frequency.value`, and `Q.value = 0.707` for
  Butterworth response
- CONNECT filters in series using `reduce()` to chain input → f1 → f2 → f3 → f4
  → output
- RETURN object with `input` (first filter), `output` (last filter), and
  `filters` array for lifecycle management
- VALIDATE frequency values before setting to prevent filter instability

### Canvas Rendering Guidelines

- TARGET 60fps using `requestAnimationFrame` for smooth animation
- ACCOUNT for `devicePixelRatio` for HiDPI support
- REUSE typed arrays (`Float32Array`) for memory-efficient FFT data handling
- USE pointer events for cross-platform touch/mouse support

### State Management (Pinia)

- CENTRALIZE audio state in `audioStore.ts`
- DEFINE reactive properties for filter frequencies, boost state, channel modes
- IMPLEMENT actions as pure functions that update state and trigger audio graph
  changes
- CREATE getters as computed properties for derived state (e.g., effective
  channel mode)

## Common Tasks & Patterns

### Adding New Audio Features

1. UPDATE audio graph in `useAudioGraph.ts`
2. ADD state management in `audioStore.ts`
3. UPDATE UI controls in `RtaCanvas.vue`
4. ADD tests for utility functions in `__tests__/`

### Audio Node Management

### Audio Node Lifecycle Management

- CREATE cleanup function that calls `disconnect()` on all audio nodes
- DISCONNECT analyzer nodes, filter nodes, and gain nodes individually
- REGISTER cleanup in `onUnmounted()` lifecycle hook
- CHECK `audioContext.state` before calling `audioContext.close()`
- ENSURE proper cleanup prevents memory leaks and audio artifacts

### Canvas Event Handling

### Canvas Event Handling Patterns

- USE `PointerEvent` for cross-platform touch/mouse compatibility
- CALCULATE coordinates using `getBoundingClientRect()` for accurate positioning
- COMPUTE relative coordinates: `x = event.clientX - rect.left`,
  `y = event.clientY - rect.top`
- VALIDATE bounds before processing: check x/y within canvas width/height
- RETURN early for out-of-bounds events to prevent invalid interactions

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

MANDATORY workflow before every commit:

```bash
# Run all quality checks
pnpm lint && pnpm test && pnpm build

# Or use the comprehensive check script
pnpm ci  # If available
```

Quality Gates:

- RUN `ESLint` for code quality and Vue/TypeScript rules
- APPLY `Prettier` for consistent formatting
- VERIFY unit tests pass
- CONFIRM production build succeeds
- CHECK `AudioNode` disconnections for proper cleanup
- MONITOR for memory leaks in audio processing
- ENSURE proper error handling in audio initialization

## Testing Strategy

### Unit Tests (Vitest)

- TEST frequency calculations and band aggregations utilities
- VERIFY audio parameter calculations in pure functions
- VALIDATE `Pinia` store actions and getters

### Integration Tests

- TEST `Web Audio API` node connections in audio graph
- VERIFY rendering functions with mock context
- VALIDATE filter dragging and button click interactions

### Performance Tests

- MONITOR `AudioNode` cleanup for memory leaks
- ENSURE 60fps canvas rendering performance
- MEASURE end-to-end audio processing latency

## Deployment & Build

### Environment Requirements

- REQUIRE `Node.js` 18+ for optimal `Vite` performance
- USE `pnpm` package manager (never use npm/yarn)
- DEPLOY with HTTPS for `getUserMedia` in production

### Build Configuration

- TARGET ES2022 for modern browser features
- IMPLEMENT code splitting for optimal loading
- CONFIGURE `PWA` service worker with precaching strategy
- OPTIMIZE images and audio samples for faster loading

### Performance Monitoring

- MONITOR chunk sizes with bundle analysis
- TRACK canvas rendering performance metrics
- MONITOR `AudioNode` lifecycle for memory usage
- MEASURE audio latency and dropout metrics

## Common Issues & Solutions

### Web Audio API Gotchas

- RESUME `AudioContext` after user gesture when suspended
- HANDLE different sample rates across devices
- ACCOUNT for varying buffer sizes between browsers/devices
- IMPLEMENT iOS Safari restrictions on `AudioContext` creation

### Canvas Performance

- AVOID frequent `getImageData()` calls by using efficient drawing patterns
- BATCH drawing operations to minimize context state changes
- USE `Float32Array` data structures for audio data

### Browser Compatibility

- LEVERAGE best `Web Audio API` support in Chromium browsers
- SUPPORT `PWA` installation in Safari with `AudioWorklet` limitations
- ENSURE good compatibility in Firefox with occasional timing differences

## Common Pitfalls

### Development Issues

- AVOID forgetting to resume `AudioContext` after user gesture
- PREVENT memory leaks by disconnecting `AudioNodes` on component unmount
- AVOID creating new objects inside render loops for canvas performance
- USE `audioContext.sampleRate` instead of hardcoding sample rates
- HANDLE filter coefficient edge cases (frequency = 0 or Nyquist)
- TEST browser compatibility instead of assuming `Web Audio API` features work
  universally

### Code Quality Issues

- AVOID large refactors in single commit; make granular changes
- WRITE proper tests for audio features (mocked or real)
- USE constants instead of magic numbers for audio parameters
- HANDLE microphone access denials gracefully
- PREVENT race conditions in async audio initialization

### TypeScript Issues

- AVOID `any` type; use proper `Web Audio API` types
- TYPE audio processing functions properly
- AVOID non-null assertions without proper checks

### Audio-Specific Issues

- CONSIDER window functions for spectral analysis
- ACCOUNT for Nyquist frequency in filter design to prevent aliasing
- OPTIMIZE audio buffer sizes for real-time processing latency
- MONITOR signal levels to prevent clipping and distortion

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
