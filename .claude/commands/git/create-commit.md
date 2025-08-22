---
allowed-tools:
  [
    "mcp__git__git_status",
    "mcp__git__git_diff_staged",
    "mcp__git__git_diff_unstaged",
    "mcp__git__git_add",
    "mcp__git__git_commit",
    "Bash(pnpm *)",
    "Bash(git *)",
    "Read",
    "Grep",
    "Glob",
  ]
description:
  Create conventional commits for audio processing and canvas optimization
  changes
arguments:
  - name: commit-message
    required: false
    description:
      Optional commit message (if not provided, will be guided through creation)
  - name: scope
    required: false
    description:
      Commit scope (audio, ui, filters, canvas, pwa, test, docs, deps)
  - name: breaking
    required: false
    description: Whether this is a breaking change
    default: false
---

# Create Audio Git Commit

## Context

- **Current directory**: Current working directory
- **Project type**: ToneAssist Professional Audio Analyzer PWA
- **Commit format**: <type>(<scope>): <description>
- **Audio focus**: Web Audio API, canvas rendering, real-time processing
- **Performance critical**: Changes affect real-time audio/visual performance

## Commit Types & Audio Context

### Primary Types

- `feat`: New audio features, filter implementations, canvas optimizations
- `fix`: Bug fixes in audio processing, filter stability, canvas rendering
- `refactor`: Code restructuring without changing audio functionality
- `perf`: Performance improvements for real-time processing
- `style`: Code formatting, linting fixes (no functional changes)
- `docs`: Documentation updates for audio APIs and usage
- `test`: Audio processing tests, canvas performance tests
- `chore`: Build process, dependencies, configuration

### Breaking Changes

- For breaking changes, add an exclamation mark (!) after the type Example
  format: feat(audio)!: redesign filter cascade implementation
- Or add BREAKING CHANGE: in commit body with migration guide

## Audio-Specific Scopes

- `audio`: Web Audio API, audio processing, signal flow
- `filters`: HPF/LPF implementation, filter coefficients, cascading
- `canvas`: Canvas rendering, visualization, performance optimization
- `stereo`: Stereo channel processing, L/R separation, routing
- `ui`: User interface components, controls, interactions
- `pwa`: Progressive Web App configuration, service worker
- `test`: Testing infrastructure, audio mocking, performance tests
- `docs`: Documentation, API references, usage guides
- `deps`: Dependencies updates, package management
- `config`: Configuration files, build setup, linting rules

## Pre-commit Workflow

### 1. Audio Quality Checks

Run these commands before committing audio changes:

```bash
# Check current status
git status

# Review audio-related changes
git diff --staged -- "src/composables/useAudioGraph.ts"
git diff --staged -- "src/components/RtaCanvas.vue"
git diff --staged -- "src/stores/audioStore.ts"

# Run quality checks specific to audio
pnpm lint
pnpm test
pnpm build

# Optional: Test audio functionality manually
pnpm dev  # Verify audio initialization and processing
```

### 2. Performance Validation

For audio and canvas changes:

```bash
# Ensure no performance regressions
pnpm test -- --run performance
pnpm build && pnpm preview  # Test production build

# Manual performance check
# - Open browser dev tools
# - Monitor frame rate during audio processing
# - Check memory usage over time
# - Verify no audio dropouts or glitches
```

### 3. Browser Compatibility Check

```bash
# Test critical audio paths
# - Chrome: Full Web Audio API support
# - Safari: PWA installation, AudioContext restrictions
# - Firefox: Alternative implementation differences
```

## Commit Message Examples

### Audio Feature Development

```bash
feat(audio): add support for 96kHz sample rates

- Implement sample rate detection and validation
- Add fallback to 48kHz for unsupported devices
- Update filter coefficients for high sample rates
- Test on Safari, Chrome, Firefox

Closes #123
```

```bash
feat(filters): implement adaptive filter Q factor

- Dynamically adjust Q based on frequency content
- Prevent filter instability at extreme settings
- Add smooth parameter transitions to avoid clicks
- Include unit tests for edge cases
```

### Performance Optimizations

```bash
perf(canvas): optimize audio analysis rendering for 60fps

- Pre-allocate Float32Array buffers to eliminate GC
- Batch canvas drawing operations for efficiency
- Implement object pooling for Path2D objects
- Reduce render time from 12ms to 4ms average

Performance impact: 3x faster rendering, stable 60fps
```

```bash
perf(audio): reduce audio processing latency

- Switch to 128-sample buffer size from 256
- Optimize filter coefficient calculations
- Remove unnecessary memory allocations in audio loop
- Measured latency reduction: 12ms -> 6ms
```

### Bug Fixes

```bash
fix(audio): resolve Safari AudioContext suspension

- Add explicit resume() call after user gesture
- Handle AudioContext state transitions properly
- Implement retry logic for suspended contexts
- Test on iOS Safari 15.4+ and macOS Safari

Fixes #456
```

```bash
fix(stereo): correct channel routing for mono input

- Fix mono signal duplication to both outputs
- Ensure proper L/R separation for stereo input
- Add silence detection per channel
- Prevent audio routing loops

Resolves user feedback about mono audio in one ear
```

### Refactoring

```bash
refactor(audio): extract filter creation utilities

- Move cascaded filter logic to separate module
- Improve code reuse between HPF and LPF
- Add comprehensive parameter validation
- Maintain backward compatibility

No functional changes to audio processing
```

## Commit Message Guidelines

### Description Requirements

- **Explain WHY**: Focus on the problem solved, not just what changed
- **Imperative mood**: "add", "fix", "update" (not "added", "fixed", "updated")
- **Audio context**: Mention impact on real-time processing when relevant
- **Performance impact**: Include performance metrics for optimization commits
- **Browser compatibility**: Note browser-specific fixes or features
- **Breaking changes**: Clearly document API changes with migration path

### Audio-Specific Guidelines

- **Filter changes**: Mention frequency response or stability impacts
- **Canvas changes**: Include performance measurements (fps, render time)
- **Sample rate changes**: Note compatibility and fallback behavior
- **Memory changes**: Quantify allocation improvements or memory usage
- **Latency changes**: Provide before/after latency measurements

## Quality Gates Before Commit

### Audio Processing Validation

- [ ] Filter coefficients mathematically correct
- [ ] No audio dropouts during processing
- [ ] Frequency response matches expectations
- [ ] Parameter ranges properly validated
- [ ] `AudioNode` cleanup implemented properly

### Performance Validation

- [ ] Canvas maintains 60fps during continuous updates
- [ ] Audio processing within real-time budget
- [ ] Memory allocations minimized in audio loops
- [ ] No performance regressions measured

### Compatibility Validation

- [ ] Chrome/Chromium: Full feature compatibility
- [ ] Safari: `AudioContext` initialization and PWA support
- [ ] Firefox: Alternative Web Audio API behavior
- [ ] Mobile: Touch interactions and performance

### Code Quality Validation

- [ ] TypeScript compilation without errors
- [ ] ESLint passes with no audio-specific warnings
- [ ] Tests pass including audio processing tests
- [ ] Documentation updated for API changes

## Example Workflow

### Complete Audio Feature Commit

```bash
# 1. Check current state and review changes
git status
git diff --staged

# 2. Run comprehensive quality checks
pnpm lint && pnpm test && pnpm build

# 3. Test audio functionality
# - Start dev server and test audio initialization
# - Verify filter responses at different frequencies
# - Check canvas performance during continuous updates
# - Test on different browsers if possible

# 4. Stage appropriate files
git add src/composables/useAudioGraph.ts
git add src/components/RtaCanvas.vue
git add src/stores/audioStore.ts
git add src/utils/audioUtils.ts

# 5. Create descriptive commit
git commit -m "feat(audio): add real-time spectrum smoothing

- Implement exponential smoothing for audio analysis display
- Add configurable smoothing time constant (0.1-0.9)
- Reduce visual flicker during rapid signal changes
- Maintain frequency resolution for transient detection
- Add unit tests for smoothing algorithms

Improves visual stability without affecting frequency accuracy"
```

### Performance Optimization Commit

```bash
git add src/components/RtaCanvas.vue
git commit -m "perf(canvas): eliminate allocations in render loop

- Pre-allocate all Float32Array buffers during initialization
- Reuse Path2D objects across animation frames
- Batch canvas drawing operations for efficiency
- Move color calculations outside per-pixel loop

Performance impact:
- Render time: 8.2ms -> 3.1ms (62% improvement)
- GC pauses eliminated during continuous operation
- Consistent 60fps maintained under load"
```

## Success Criteria

A successful ToneAssist commit:

- **CLEARLY describes** the audio/visual impact of changes
- **VALIDATES** real-time performance requirements are met
- **ENSURES** browser compatibility across target platforms
- **PROVIDES** performance metrics for optimization changes
- **MAINTAINS** audio engineering correctness
- **INCLUDES** appropriate test coverage for audio changes
- **DOCUMENTS** breaking changes with migration guidance
- **FOLLOWS** conventional commit format consistently

## References

- Conventional Commits: https://www.conventionalcommits.org/
- Web Audio API Spec: https://webaudio.github.io/web-audio-api/
- CLAUDE.md: Project-specific audio patterns and performance requirements
- Canvas Performance Guide: Optimization techniques for real-time rendering
