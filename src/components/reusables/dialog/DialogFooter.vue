<template>
  <div class="dialog-footer">
    <slot />
  </div>
</template>

<script setup lang="ts">
// 纯展示组件，不需要额外逻辑
</script>

<style scoped>
.dialog-footer {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 8px;
}

/* 垂直排列按钮 */
.dialog-footer.vertical {
  flex-direction: column;
}
</style>
