<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-container" @click.stop>
        <div class="modal-header" v-if="$slots.header || title">
          <slot name="header">
            <h3 class="modal-title">{{ title }}</h3>
          </slot>
          <button
            v-if="showCloseButton"
            class="modal-close"
            @click="handleClose"
          >
            <X :size="16" />
          </button>
        </div>

        <div class="modal-content">
          <slot></slot>
        </div>

        <div class="modal-footer" v-if="$slots.footer || showDefaultFooter">
          <slot name="footer">
            <div v-if="showDefaultFooter" class="modal-actions">
              <button class="modal-btn cancel-btn" @click="handleCancel">
                {{ cancelText }}
              </button>
              <button
                class="modal-btn confirm-btn"
                :class="{ 'danger-btn': isDanger }"
                @click="handleConfirm"
                :disabled="confirmDisabled"
              >
                {{ confirmText }}
              </button>
            </div>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from "lucide-vue-next";

// Props
interface Props {
  visible: boolean;
  title?: string;
  showCloseButton?: boolean;
  showDefaultFooter?: boolean;
  cancelText?: string;
  confirmText?: string;
  isDanger?: boolean;
  confirmDisabled?: boolean;
  closeOnOverlayClick?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showCloseButton: true,
  showDefaultFooter: true,
  cancelText: "取消",
  confirmText: "确认",
  isDanger: false,
  confirmDisabled: false,
  closeOnOverlayClick: true,
});

// Emits
const emit = defineEmits<{
  close: [];
  cancel: [];
  confirm: [];
}>();

// 处理关闭
const handleClose = () => {
  emit("close");
};

// 处理取消
const handleCancel = () => {
  emit("cancel");
};

// 处理确认
const handleConfirm = () => {
  emit("confirm");
};

// 处理遮罩点击
const handleOverlayClick = () => {
  if (props.closeOnOverlayClick) {
    emit("close");
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
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

.modal-container {
  background: var(--menu-bg);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  width: 440px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  animation: scaleIn 0.2s ease;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--menu-border);
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

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--menu-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  margin: 0;
  font-size: var(--editor-font-size);
  font-weight: 600;
  color: var(--menu-text);
}

.modal-close {
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

.modal-close:hover {
  background: var(--menu-item-hover);
  color: var(--menu-text);
}

.modal-content {
  padding: 16px 20px;
  flex: 1;
  overflow-y: auto;
}

.modal-footer {
  padding: 12px 20px 16px;
  border-top: 1px solid var(--menu-border);
  background: var(--color-bg-muted);
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.modal-btn {
  padding: 5px 16px;
  border-radius: 6px;
  font-size: var(--ui-font-size);
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.15s ease;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 0 0 rgba(27, 31, 36, 0.1);
}

.cancel-btn {
  background: var(--color-bg);
  color: var(--menu-text);
  border-color: var(--menu-border);
}

.cancel-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  border-color: var(--menu-text-muted);
}

.confirm-btn {
  background: var(--color-block-ref);
  color: white;
  border-color: var(--color-block-ref);
  box-shadow: 0 1px 0 rgba(27, 31, 36, 0.04);
}

.confirm-btn:hover:not(:disabled) {
  background: var(--color-link);
  border-color: var(--color-link);
  box-shadow: 0 1px 0 rgba(27, 31, 36, 0.1);
}

.confirm-btn.danger-btn {
  background: var(--color-bg);
  color: var(--menu-danger);
  border-color: var(--menu-border);
  box-shadow: 0 1px 0 rgba(27, 31, 36, 0.04);
}

.confirm-btn.danger-btn:hover:not(:disabled) {
  background: var(--menu-danger-hover);
  color: var(--menu-danger);
  border-color: var(--menu-danger);
  box-shadow: 0 1px 0 rgba(27, 31, 36, 0.1);
}
</style>
