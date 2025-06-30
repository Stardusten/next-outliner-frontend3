<template>
  <p class="dialog-description">
    <slot />
  </p>
</template>

<script setup lang="ts">
// 纯展示组件
</script>

<style scoped>
.dialog-description {
  margin: 4px 0 0 0;
  font-size: var(--ui-font-size-small);
  color: var(--menu-text-muted);
  line-height: 1.4;
}
</style>
