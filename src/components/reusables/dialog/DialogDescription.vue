<template>
  <p class="dialog-description">
    <slot />
  </p>
</template>

<script setup lang="ts">
// 纯展示组件，不需要额外逻辑
</script>

<style scoped>
.dialog-description {
  margin: 0;
  font-size: var(--ui-font-size);
  line-height: 1.5;
  color: var(--color-text-muted);
}
</style>
