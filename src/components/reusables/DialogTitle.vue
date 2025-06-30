<template>
  <h2 class="dialog-title">
    <slot />
  </h2>
</template>

<script setup lang="ts">
// 纯展示组件
</script>

<style scoped>
.dialog-title {
  margin: 0;
  font-size: var(--editor-font-size);
  font-weight: 600;
  color: var(--menu-text);
  line-height: 1.2;
}
</style>
