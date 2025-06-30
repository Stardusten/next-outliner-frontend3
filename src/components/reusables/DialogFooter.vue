<template>
  <div class="dialog-footer">
    <slot />
  </div>
</template>

<script setup lang="ts">
// 纯展示组件
</script>

<style scoped>
.dialog-footer {
  padding: 0 16px;
  border-top: 1px solid var(--menu-border);
  background: var(--color-bg-muted);
  flex-shrink: 0;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
</style>
