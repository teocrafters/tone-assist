# RTA - Real-Time Audio Analyzer

A Progressive Web App for real-time audio analysis with adjustable HPF/LPF
filters and stereo support.

## Overview

RTA is a web-based real-time audio analyzer designed for professional audio
monitoring and analysis. It provides live spectral analysis with interactive
filter controls, supporting both mono and stereo audio sources through the Web
Audio API.

## Tech Stack

- **Frontend Framework**: Vue 3 with Composition API
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: Pinia
- **Audio Processing**: Web Audio API (BiquadFilterNode, AnalyserNode)
- **PWA**: Vite PWA Plugin with Workbox
- **Testing**: Vitest + jsdom
- **Linting**: ESLint + Prettier
- **Package Manager**: pnpm

## Features

### 🎵 **Audio Analysis**

- **Real-Time Analyzer (RTA)**: 120 logarithmic frequency bands (20Hz-20kHz)
- **Live FFT Analysis**: Continuous spectral analysis with configurable window
- **Input/Output Modes**: Switch between pre-filter and post-filter analysis
- **Interactive Tooltips**: Hover/touch to see frequency and dB levels
- **+20dB Boost**: Toggle for gain compensation visualization

### 🎛️ **Audio Processing**

- **Filters**: Adjustable HPF and LPF with 48dB/octave slope (4× cascaded
  BiquadFilters)
- **Stereo Support**: Automatic mono/stereo detection and processing
- **Silence Detection**: 500ms silence threshold with automatic channel
  switching
- **Audio Routing**: Smart routing (mono→stereo duplication, stereo→L/R
  separation)
- **Low Latency**: Optimized for interactive AudioContext

### 📱 **User Interface**

- **Responsive Canvas**: HiDPI-ready visualization with smooth animations
- **Drag Controls**: Interactive filter handle manipulation on the spectrum
- **Mode Switching**: Toggle between mono/stereo and input/output views
- **Touch Support**: Full mobile device compatibility
- **PWA**: Installable on mobile devices (Android/iOS)

## Architecture

### Audio Graph Structure

```
Microphone Input → ChannelSplitter → [HPF → LPF → Boost] → AnalyserNodes → Visualization
                                   ↓
                              ChannelMerger → Output
```

### Key Components

- `useAudioGraph.ts` - Core Web Audio API logic and graph management
- `audioStore.ts` - Global audio state with Pinia
- `RtaCanvas.vue` - Canvas-based visualization and user interaction
- `useSilenceDetector.ts` - Channel activity detection
- `logBands.ts` - Frequency band aggregation utilities

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Production build
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format
```

### Code Conventions

- **TypeScript**: Strict mode enabled, explicit types required
- **Vue 3**: Composition API with `<script setup>`
- **Formatting**: Prettier with 2-space indentation, no semicolons
- **Linting**: ESLint with Vue and TypeScript rules
- **Testing**: Unit tests for utilities, integration tests for audio processing

### Git Workflow

- **Commit Convention**:
  [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat`: New features
  - `fix`: Bug fixes
  - `docs`: Documentation updates
  - `style`: Code style changes
  - `refactor`: Code refactoring
  - `test`: Test additions/updates
  - `chore`: Build/tooling changes

### Commit Message Format

```
type(scope): description

feat(audio): add stereo channel detection
fix(ui): resolve tooltip positioning bug
docs(readme): update installation instructions
```

## Browser Compatibility

- **Chrome**: 90+ (full Web Audio API support)
- **Safari**: 15.4+ (iOS PWA support)
- **Firefox**: 88+ (getUserMedia and AudioWorklet)
- **Requirements**: HTTPS for microphone access

## Deployment

The app is deployed as a static PWA. Key considerations:

- **HTTPS Required**: For microphone access via getUserMedia
- **Audio Context**: Requires user gesture to start
- **Service Worker**: Precaches app shell for offline functionality

## Performance

- **60fps Canvas**: Optimized rendering loop with requestAnimationFrame
- **Memory Management**: Proper cleanup of audio nodes and event listeners
- **Audio Buffers**: Efficient FFT data processing with typed arrays
- **Bundle Size**: ~80KB gzipped with tree-shaking
