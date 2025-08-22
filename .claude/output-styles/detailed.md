---
name: detailed
description:
  Comprehensive explanations for complex audio processing features and
  architectural decisions
---

# Detailed Output Style

Comprehensive, educational responses for complex audio processing
implementations, architectural decisions, and in-depth technical analysis.

## Response Characteristics

- **Comprehensive**: Full technical explanation with background
- **Educational**: Explains the "why" behind audio engineering decisions
- **Thorough**: Covers edge cases, alternatives, and trade-offs
- **Research-based**: References audio engineering principles and browser
  specifications
- **Complete**: Includes testing strategies and validation approaches

## Usage Context

Use this style for:

- Complex audio feature architecture
- Web Audio API deep-dive implementations
- Canvas rendering optimization strategies
- Cross-browser compatibility analysis
- Performance profiling and optimization
- Audio engineering algorithm explanations
- System design and scalability discussions
- Debugging complex audio processing issues

## Response Format

```
[Comprehensive problem analysis]
[Audio engineering principles as rules]
[Implementation strategy as ordered rules]
[Performance rules and constraints]
[Testing approach rules]
[Trade-offs as decision rules]
```

## Complex Audio Processing Rules

### Adaptive FFT Window Sizing

#### Content Analysis Principles

- CALCULATE spectral centroid as weighted average of frequency bins for content
  characterization
- MEASURE spectral spread as variance around centroid to determine bandwidth
  characteristics
- DETECT harmonic content through peak detection and harmonic ratio analysis
- ESTIMATE transient density from temporal energy variations between frames
- COMBINE multiple spectral features for robust content classification

#### Window Size Selection Logic

- SELECT 512-sample windows when transient density exceeds 0.7 for temporal
  precision
- SELECT 4096-sample windows for harmonic content above 0.8 with centroid below
  2kHz
- SELECT 1024-sample windows for broadband content when spectral spread exceeds
  0.6
- DEFAULT to 2048-sample windows for balanced time-frequency resolution
- IMPLEMENT 15% hysteresis threshold to prevent rapid oscillation between window
  sizes

#### Performance Optimization Strategy

- INITIALIZE all analyzer nodes at startup with different FFT sizes (512, 1024,
  2048, 4096, 8192)
- MAINTAIN analyzer pool instead of runtime reconfiguration to avoid processing
  delays
- PRE-ALLOCATE all analysis buffers at maximum required size to prevent
  allocations
- DISCONNECT current analyzer before connecting new one to avoid audio glitches
- CACHE spectral characteristics to reduce redundant calculations

#### Window Function Selection

- APPLY 'hann' window for FFT sizes below 1024 samples for transient analysis
- APPLY 'blackman-harris' window for FFT sizes 1024 and above for frequency
  precision
- ADJUST `smoothingTimeConstant` inversely with window size for consistent
  behavior
- CONSIDER content type when selecting window function characteristics

### Real-time Audio Processing Architecture

#### Memory Management Rules

- PRE-ALLOCATE all audio buffers during initialization phase
- IMPLEMENT object pooling for frequently created/destroyed audio objects
- AVOID garbage collection during audio processing by eliminating allocations
- REUSE typed arrays across processing frames
- MONITOR memory usage patterns to detect leaks

#### Threading and Scheduling

- PROCESS audio in dedicated threads when `AudioWorklet` is available
- PRIORITIZE audio processing over visual updates in resource contention
- IMPLEMENT frame-based processing with consistent buffer sizes
- HANDLE buffer underruns gracefully with silence insertion
- MAINTAIN separate processing pipelines for different audio sources

#### Cross-browser Compatibility Strategy

- FEATURE-DETECT Web Audio API capabilities before advanced usage
- IMPLEMENT graceful degradation for unsupported features
- ACCOUNT for Safari's `AudioContext` suspension behavior
- HANDLE Firefox's different FFT implementation characteristics
- TEST latency characteristics across browsers and adjust accordingly

### Canvas Rendering Optimization for Audio Data

#### High-frequency Update Rules

- IMPLEMENT level-of-detail rendering based on zoom level and data density
- BATCH all drawing operations within single frame budget (16.67ms)
- USE multiple render passes for complex visualizations
- IMPLEMENT frustum culling for off-screen audio data
- OPTIMIZE for 60fps with graceful degradation to 30fps under load

#### HiDPI and Responsive Design

- SCALE rendering context by `devicePixelRatio` for crisp visuals
- IMPLEMENT responsive breakpoints for different screen sizes
- CACHE expensive rendering calculations across frames
- USE worker threads for heavy data processing when available
- IMPLEMENT progressive rendering for large datasets

## Testing Strategy Rules

### Unit Testing for Audio Processing

- MOCK `AudioContext` and audio nodes for deterministic testing
- GENERATE synthetic test signals with known characteristics
- VERIFY mathematical correctness of audio algorithms
- TEST edge cases including silence, clipping, and extreme frequencies
- MEASURE processing performance under various loads

### Integration Testing Strategy

- TEST complete audio processing chains from input to output
- VALIDATE browser compatibility across target platforms
- MONITOR memory usage during extended operation
- TEST with real-world audio content including music and speech
- VERIFY graceful degradation under resource constraints

### Performance Testing Rules

- MEASURE CPU usage and maintain below 30% on target devices
- MONITOR memory allocation patterns for leaks
- TEST frame rate stability during continuous operation
- VALIDATE audio latency stays below 10ms end-to-end
- BENCHMARK against performance targets regularly

## Trade-offs and Decision Rules

### Complexity vs Performance

- BALANCE algorithmic sophistication with real-time constraints
- CHOOSE simpler approaches when performance margin is tight
- IMPLEMENT progressive complexity based on device capabilities
- PREFER proven algorithms over experimental approaches for production

### Memory vs CPU Trade-offs

- PRE-COMPUTE and cache when memory allows
- PREFER computational approaches when memory is constrained
- BALANCE analyzer pool size against memory usage
- IMPLEMENT adaptive quality based on available resources

### Accuracy vs Latency

- MINIMIZE processing delay for real-time applications
- ACCEPT some accuracy loss for reduced latency when appropriate
- IMPLEMENT separate high-accuracy and low-latency modes
- PROVIDE user control over quality vs performance balance

## Advanced Implementation Patterns

### Machine Learning Integration Rules

- TRAIN models on spectral characteristics for improved window selection
- IMPLEMENT predictive adaptation based on audio content classification
- USE user interaction patterns to improve automatic settings
- BALANCE model complexity with real-time execution requirements

### DSP Enhancement Patterns

- IMPLEMENT overlap-add windowing for smooth transitions
- USE multiple simultaneous window sizes for multi-resolution analysis
- APPLY psychoacoustic masking considerations for perceptually relevant analysis
- IMPLEMENT adaptive noise reduction based on spectral content

This comprehensive approach ensures robust, performant audio processing while
maintaining flexibility for different use cases and device capabilities.
