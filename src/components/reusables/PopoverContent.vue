<template>
  <div class="popover-content">
    <!-- 头部 -->
    <div class="popover-header" v-if="title || $slots.header">
      <div class="popover-title" v-if="title">
        <component
          v-if="titleIcon"
          :is="titleIcon"
          :size="16"
          class="title-icon"
        />
        <span>{{ title }}</span>
      </div>
      <slot name="header" />
      <button v-if="showClose" class="popover-close" @click="$emit('close')">
        <X :size="14" />
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="popover-body" :class="{ 'has-footer': $slots.footer }">
      <slot />
    </div>

    <!-- 底部 -->
    <div class="popover-footer" v-if="$slots.footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from "lucide-vue-next";
import type { Component } from "vue";

interface Props {
  title?: string;
  titleIcon?: Component;
  showClose?: boolean;
}

withDefaults(defineProps<Props>(), {
  showClose: true,
});

defineEmits<{
  close: [];
}>();
</script>

<style scoped>
.popover-content {
  display: flex;
  flex-direction: column;
  max-height: inherit;
  overflow: hidden;
}

/* 头部 */
.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color-muted);
  flex-shrink: 0;
}

.popover-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--ui-font-size);
  font-weight: 600;
  color: var(--color-text);
}

.title-icon {
  color: var(--color-text-muted);
}

.popover-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.popover-close:hover {
  background: var(--color-bg-hover);
  color: var(--color-text);
}

/* 内容区域 */
.popover-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.popover-body.has-footer {
  border-bottom: 1px solid var(--border-color-muted);
}

/* 底部 */
.popover-footer {
  padding: 12px 16px;
  flex-shrink: 0;
  background: var(--color-bg-muted);
}
</style>
