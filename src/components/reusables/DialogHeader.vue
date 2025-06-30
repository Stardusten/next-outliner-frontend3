<template>
  <div class="dialog-header">
    <slot />
  </div>
</template>

<script setup lang="ts">
// 纯展示组件
</script>

<style scoped>
.dialog-header {
  padding: 0 16px;
  border-bottom: 1px solid var(--menu-border);
  flex-shrink: 0;
  min-height: 56px;
  display: flex;
  align-items: center;
}
</style>
