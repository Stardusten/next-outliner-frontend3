<template>
  <div class="dialog-body">
    <slot />
  </div>
</template>

<script setup lang="ts">
// 纯展示组件
</script>

<style scoped>
.dialog-body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}
</style>
