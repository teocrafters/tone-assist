<script setup lang="ts">
import { useAudioStore } from "@/stores/audioStore"

interface Props {
  starting: boolean
}

interface Emits {
  (e: "startAudio"): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const audioStore = useAudioStore()

function startAudio() {
  emit("startAudio")
}
</script>

<template>
  <div v-if="!audioStore.isStarted" class="start-overlay">
    <button class="start-button" :disabled="starting" @click="startAudio">
      {{ starting ? "Starting..." : "Start Audio" }}
    </button>
    <p class="instruction">Tap to start microphone and audio processing</p>
    <p class="headphones-warning">⚠️ Use headphones to prevent feedback</p>
  </div>

  <div v-if="audioStore.errorMessage" class="error-overlay">
    <div class="error-message">{{ audioStore.errorMessage }}</div>
    <button class="error-dismiss" @click="audioStore.clearError">
      Dismiss
    </button>
  </div>

  <div v-if="audioStore.isStarted" class="mode-indicator">
    {{ audioStore.getEffectiveChannelMode().toUpperCase() }}
    <span v-if="audioStore.inputChannelCount > 1" class="channel-status">
      (L: {{ audioStore.activeChannels.left ? "✓" : "✗" }} R:
      {{ audioStore.activeChannels.right ? "✓" : "✗" }})
    </span>
  </div>
</template>

<style scoped>
.start-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 10;
}

.start-button {
  padding: 20px 40px;
  font-size: 18px;
  font-weight: bold;
  color: white;
  background: linear-gradient(45deg, #39c4ff, #0084ff);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 20px;
}

.start-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 8px 25px rgba(57, 196, 255, 0.3);
}

.start-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.instruction {
  color: #ccc;
  font-size: 16px;
  margin: 10px 0;
}

.headphones-warning {
  color: #ff9800;
  font-size: 14px;
  font-weight: bold;
}

.error-overlay {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 0, 0, 0.9);
  color: white;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  z-index: 20;
  max-width: 80%;
}

.error-message {
  margin-bottom: 10px;
}

.error-dismiss {
  background: transparent;
  color: white;
  border: 1px solid white;
  padding: 5px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.error-dismiss:hover {
  background: white;
  color: red;
}

.mode-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  font-weight: bold;
  z-index: 15;
}

.channel-status {
  font-weight: normal;
  opacity: 0.8;
  margin-left: 5px;
}
</style>
