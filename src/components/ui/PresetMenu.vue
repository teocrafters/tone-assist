<script setup lang="ts">
import { FILTER_PRESETS } from "@/stores/audioStore"
import { useAudioStore } from "@/stores/audioStore"

interface Props {
  showMenu: boolean
  updateAllFilterNodes: () => void
}

interface Emits {
  (e: "update:showMenu", value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const audioStore = useAudioStore()

function applyPreset(preset: (typeof FILTER_PRESETS)[0]) {
  audioStore.applyPreset(preset)
  // Ensure all filter nodes are synchronized
  props.updateAllFilterNodes()
  emit("update:showMenu", false)
}

function closeMenu() {
  emit("update:showMenu", false)
}
</script>

<template>
  <div v-if="showMenu" class="preset-menu">
    <div class="preset-header">
      <h3>Filter Presets</h3>
      <button @click="closeMenu">×</button>
    </div>
    <div class="preset-grid">
      <div
        v-for="(preset, index) in FILTER_PRESETS"
        :key="preset.name"
        class="preset-button"
        @click="applyPreset(preset)">
        <strong>{{ index + 1 }}. {{ preset.name }}</strong>
        <span>{{ preset.hpf }}Hz - {{ preset.lpf }}Hz</span>
        <small>{{ preset.description }}</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preset-menu {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.95);
  border: 2px solid #39c4ff;
  border-radius: 12px;
  padding: 20px;
  z-index: 30;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  color: white;
}

.preset-header button {
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.preset-button {
  background: linear-gradient(45deg, #333, #555);
  border: 1px solid #666;
  border-radius: 8px;
  color: white;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  text-align: left;
  gap: 4px;
}

.preset-button:hover {
  background: linear-gradient(45deg, #39c4ff, #0084ff);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(57, 196, 255, 0.3);
}

.preset-button strong {
  font-size: 14px;
}

.preset-button span {
  font-size: 12px;
  color: #39c4ff;
}

.preset-button small {
  font-size: 10px;
  color: #aaa;
}
</style>
