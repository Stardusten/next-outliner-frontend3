<template>
  <div class="dialog-content-wrapper">
    <slot />
  </div>
</template>

<script setup lang="ts">
// 纯展示组件，不需要逻辑
</script>

<style scoped>
.dialog-content-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: inherit;
}

/* header 样式 */
.dialog-content-wrapper :deep(.dialog-header) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--menu-border);
  flex-shrink: 0;
}

/* footer 样式 - 和 header 保持相同的 padding */
.dialog-content-wrapper :deep(.dialog-footer) {
  padding: 12px 16px;
  border-top: 1px solid var(--menu-border);
  background: var(--color-bg-muted);
  flex-shrink: 0;
}
</style>
