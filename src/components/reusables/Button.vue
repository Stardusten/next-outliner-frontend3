<template>
  <button
    :class="[
      'btn',
      `btn-${variant}`,
      `btn-${size}`,
      {
        'btn-disabled': disabled,
        'btn-loading': loading,
      },
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <slot name="icon" v-if="$slots.icon && !loading" />
    <div v-if="loading" class="btn-spinner"></div>
    <slot />
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "danger"
    | "outline"
    | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: "default",
  size: "md",
  disabled: false,
  loading: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const handleClick = (event: MouseEvent) => {
  emit("click", event);
};
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 6px;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  outline: none;
  text-decoration: none;
  white-space: nowrap;
  user-select: none;
}

.btn:focus-visible {
  outline: 2px solid var(--color-block-ref);
  outline-offset: 2px;
}

.btn:active:not(.btn-disabled) {
  transform: translateY(1px);
}

/* 尺寸 */
.btn-sm {
  height: 28px;
  padding: 0 12px;
  font-size: var(--ui-font-size-small);
  min-width: 60px;
}

.btn-md {
  height: 32px;
  padding: 0 16px;
  font-size: var(--ui-font-size);
  min-width: 80px;
}

.btn-lg {
  height: 40px;
  padding: 0 20px;
  font-size: var(--ui-font-size);
  min-width: 100px;
}

/* 变体 */
.btn-default {
  background: var(--color-bg);
  color: var(--menu-text);
  border-color: var(--menu-border);
}

.btn-default:hover:not(.btn-disabled) {
  background: var(--color-bg-hover);
  border-color: var(--menu-text-muted);
}

.btn-primary {
  background: var(--color-block-ref);
  color: white;
  border-color: var(--color-block-ref);
  box-shadow: 0 1px 0 rgba(27, 31, 36, 0.04);
}

.btn-primary:hover:not(.btn-disabled) {
  background: var(--color-link);
  border-color: var(--color-link);
  box-shadow: 0 1px 0 rgba(27, 31, 36, 0.1);
}

.btn-secondary {
  background: var(--color-bg-muted);
  color: var(--color-text);
  border-color: var(--color-bg-muted);
}

.btn-secondary:hover:not(.btn-disabled) {
  background: var(--color-bg-hover);
}

.btn-danger {
  background: var(--menu-danger);
  color: white;
  border-color: var(--menu-danger);
}

.btn-danger:hover:not(.btn-disabled) {
  background: var(--menu-danger-hover-filled);
  border-color: var(--menu-danger-hover-filled);
}

.btn-outline {
  background: transparent;
  color: var(--color-text);
  border-color: var(--menu-border);
}

.btn-outline:hover:not(.btn-disabled) {
  background: var(--color-bg-hover);
  border-color: var(--color-block-ref);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text);
  border-color: transparent;
}

.btn-ghost:hover:not(.btn-disabled) {
  background: var(--color-bg-hover);
}

/* 状态 */
.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.btn-loading {
  cursor: not-allowed;
}

/* 加载动画 */
.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
