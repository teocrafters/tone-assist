---
name: quick-fix
description:
  Concise responses for simple bug fixes and quick audio/canvas adjustments
---

# Quick Fix Output Style

Concise, direct responses for simple bug fixes, small audio adjustments, and
quick canvas optimizations.

## Response Characteristics

- **Concise**: Minimal explanation, focus on solution
- **Direct**: Straight to the code or fix needed
- **Targeted**: Address specific issue without extended context
- **Efficient**: Quick to read and implement

## Usage Context

Use this style for:

- Simple bug fixes in audio processing
- Quick canvas rendering adjustments
- Minor filter parameter tweaks
- Configuration corrections
- Small performance optimizations
- Linting/formatting fixes
- Quick Web Audio API corrections

## Response Format

```
[One-line issue identification]
[Specific fix rule with file:line reference]
```

## Implementation Rules

### Filter Frequency Issues

- CLAMP frequency values to `audioContext.sampleRate / 2` to respect Nyquist
  limit
- USE `Math.min()` to enforce frequency upper boundary
- REFERENCE specific file location with `filename:line` format

### Canvas Positioning Issues

- DIVIDE pixel coordinates by `devicePixelRatio` for HiDPI logical positioning
- CONSTRAIN positioning within canvas boundaries using `Math.max()` and
  `Math.min()`
- ACCOUNT for scaling factors when calculating interactive element positions

### AudioContext State Issues

- CHECK `audioContext.state` for 'suspended' status before operations
- CALL `audioContext.resume()` after user interaction when suspended
- AWAIT resume completion before proceeding with audio processing

### Performance Quick Fixes

- ELIMINATE object creation inside render loops
- MOVE calculations outside of per-frame operations
- CACHE frequently accessed DOM measurements

## Guidelines

- IDENTIFY problem in single sentence
- PROVIDE minimal fix with file location when possible
- INCLUDE brief explanation only if fix isn't obvious
- AVOID extended background or architectural discussion
- FOCUS on exact change needed
