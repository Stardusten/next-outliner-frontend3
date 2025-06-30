<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast" tag="div">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :class="[`toast-${toast.type}`]"
          @click="removeToast(toast.id)"
        >
          <div class="toast-icon">
            <CheckCircle2 v-if="toast.type === 'success'" :size="16" />
            <AlertCircle v-else-if="toast.type === 'error'" :size="16" />
            <AlertTriangle v-else-if="toast.type === 'warning'" :size="16" />
            <Info v-else :size="16" />
          </div>
          <div class="toast-content">
            <div class="toast-title" v-if="toast.title">{{ toast.title }}</div>
            <div class="toast-message">{{ toast.message }}</div>
          </div>
          <button class="toast-close" @click.stop="removeToast(toast.id)">
            <X :size="14" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-vue-next";
import type { ToastItem } from "@/composables/useToast";

// Props
defineProps<{
  toasts: ToastItem[];
}>();

// Emits
const emit = defineEmits<{
  remove: [id: string];
}>();

// 移除 toast
const removeToast = (id: string) => {
  emit("remove", id);
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast-item {
  background: var(--toast-bg);
  border: 1px solid var(--toast-border);
  border-radius: var(--toast-border-radius);
  box-shadow: var(--toast-shadow);
  padding: var(--toast-padding);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 400px;
  min-width: 320px;
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.toast-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--toast-shadow-hover);
}

.toast-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: var(--toast-title-font-size);
  font-weight: 600;
  color: var(--toast-title-color);
  margin-bottom: 4px;
  word-wrap: break-word;
}

.toast-message {
  font-size: var(--toast-message-font-size);
  color: var(--toast-message-color);
  line-height: 1.4;
  word-wrap: break-word;
}

.toast-close {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--toast-close-color);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.15s ease;
  margin-top: 1px;
}

.toast-close:hover {
  background: var(--toast-close-hover-bg);
  color: var(--toast-close-hover-color);
}

/* 成功样式 */
.toast-success {
  border-left: 4px solid var(--toast-success-border);
}

.toast-success .toast-icon {
  color: var(--toast-success-icon);
}

/* 错误样式 */
.toast-error {
  border-left: 4px solid var(--toast-error-border);
}

.toast-error .toast-icon {
  color: var(--toast-error-icon);
}

/* 警告样式 */
.toast-warning {
  border-left: 4px solid var(--toast-warning-border);
}

.toast-warning .toast-icon {
  color: var(--toast-warning-icon);
}

/* 信息样式 */
.toast-info {
  border-left: 4px solid var(--toast-info-border);
}

.toast-info .toast-icon {
  color: var(--toast-info-icon);
}

/* 动画 */
.toast-enter-active {
  transition: all 0.3s ease;
}

.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) translateY(-10px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
