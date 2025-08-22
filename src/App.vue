<script setup lang="ts">
import RtaCanvas from "./components/RtaCanvas.vue"
</script>

<template>
  <div id="app">
    <RtaCanvas />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

#app {
  background: #000;
}
</style>
