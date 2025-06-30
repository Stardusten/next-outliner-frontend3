<template>
  <h2 class="dialog-title">
    <slot />
  </h2>
</template>

<script setup lang="ts">
// 纯展示组件，不需要额外逻辑
</script>

<style scoped>
.dialog-title {
  margin: 0;
  font-size: var(--editor-font-size);
  font-weight: 600;
  color: var(--menu-text);
}
</style>
