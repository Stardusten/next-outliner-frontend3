<template>
  <div class="dialog-content">
    <slot />
  </div>
</template>

<script setup lang="ts">
// 纯展示组件
</script>

<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
</style>
