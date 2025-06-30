<template>
  <div class="dialog-closer">
    <button class="close-button" @click="handleClose" aria-label="关闭">
      <X :size="16" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { X } from "lucide-vue-next";

const emit = defineEmits<{
  "update:open": [open: boolean];
}>();

const handleClose = () => {
  emit("update:open", false);
};
</script>

<style scoped>
.dialog-closer {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--menu-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-button:hover {
  background: var(--menu-item-hover);
  color: var(--menu-text);
}
</style>
