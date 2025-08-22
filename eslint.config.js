import js from "@eslint/js"
import pluginVue from "eslint-plugin-vue"
import * as parserVue from "vue-eslint-parser"
import configTypescript from "@vue/eslint-config-typescript"
import configPrettier from "@vue/eslint-config-prettier"

export default [
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"],
  },

  {
    name: "app/files-to-ignore",
    ignores: ["**/dist/**", "**/dist-ssr/**", "**/coverage/**"],
  },

  js.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  ...configTypescript(),
  configPrettier,

  {
    name: "app/vue-rules",
    files: ["**/*.vue"],
    languageOptions: {
      parser: parserVue,
      parserOptions: {
        parser: "@typescript-eslint/parser",
        sourceType: "module",
      },
    },
    rules: {
      // Vue-specific rules
      "vue/multi-word-component-names": "off",
      "vue/no-reserved-component-names": "off",
      "vue/block-order": [
        "error",
        {
          order: ["script", "template", "style"],
        },
      ],

      // Composition API rules
      "vue/require-default-prop": "off",
      "vue/require-explicit-emits": "error",
      "vue/no-setup-props-reactivity-loss": "error",

      // Audio-specific patterns
      "vue/no-mutating-props": "error",
      "vue/no-side-effects-in-computed-properties": "error",

      // TypeScript rules for Vue files
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    name: "app/typescript-rules",
    files: ["**/*.{ts,mts,tsx}"],
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Basic syntax rules only (no type information required)
    },
  },

  {
    name: "app/web-audio-rules",
    files: ["src/composables/useAudioGraph.ts", "src/utils/audioUtils.ts"],
    rules: {
      // Audio-specific linting rules
      "no-console": "off", // Allow console for audio debugging
      "@typescript-eslint/no-non-null-assertion": "off", // Audio nodes often need !
    },
  },
]
