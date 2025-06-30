<template>
  <teleport to="body">
    <div v-if="open" class="dialog-overlay" @click="handleOverlayClick">
      <div class="dialog-container" @click.stop role="dialog" aria-modal="true">
        <slot />
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

interface Props {
  open: boolean;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  closeOnClickOutside: true,
  closeOnEscape: true,
});

const emit = defineEmits<{
  "update:open": [open: boolean];
}>();

// 处理 overlay 点击
const handleOverlayClick = () => {
  if (props.closeOnClickOutside) {
    emit("update:open", false);
  }
};

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && props.closeOnEscape && props.open) {
    emit("update:open", false);
  }
};

onMounted(() => {
  if (props.closeOnEscape) {
    document.addEventListener("keydown", handleKeyDown);
  }
});

onUnmounted(() => {
  if (props.closeOnEscape) {
    document.removeEventListener("keydown", handleKeyDown);
  }
});
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog-container {
  background: var(--menu-bg);
  border: 1px solid var(--menu-border);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  width: 440px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
