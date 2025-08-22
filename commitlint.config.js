/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Custom rules for RTA project
    "type-enum": [
      2,
      "always",
      [
        "feat", // New features
        "fix", // Bug fixes
        "docs", // Documentation updates
        "style", // Code style changes (formatting, etc)
        "refactor", // Code refactoring
        "perf", // Performance improvements
        "test", // Test additions/updates
        "chore", // Build/tooling changes
        "ci", // CI/CD changes
        "revert", // Revert changes
      ],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "audio", // Web Audio API, audio processing
        "ui", // User interface, canvas, components
        "filters", // HPF/LPF filter logic
        "stereo", // Stereo channel processing
        "pwa", // PWA configuration
        "build", // Build configuration
        "deps", // Dependencies
        "config", // Configuration files
        "docs", // Documentation
        "test", // Testing
        "ai", // AI-related changes
      ],
    ],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
    "subject-max-length": [2, "always", 72],
    "body-max-line-length": [2, "always", 100],
  },
}
