<template>
  <div class="dialog-header">
    <slot />
  </div>
</template>

<script setup lang="ts">
// 纯展示组件，不需要额外逻辑
</script>

<style scoped>
.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}
</style>
