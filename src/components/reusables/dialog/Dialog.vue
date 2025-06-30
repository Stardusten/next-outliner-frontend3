<template>
  <teleport to="body">
    <div
      v-if="open"
      class="dialog-overlay"
      :class="{ positioned: !!position }"
      @click="handleOverlayClick"
    >
      <div
        ref="contentRef"
        class="dialog-content"
        :class="{ 'dialog-modal': !position }"
        :style="contentStyle"
        @click.stop
        role="dialog"
        aria-modal="true"
      >
        <slot />
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

interface Props {
  open: boolean;
  position?: { x: number; y: number };
  width?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  closeOnClickOutside: true,
  closeOnEscape: true,
  width: "auto",
  maxWidth: "90vw",
  maxHeight: "80vh",
});

const emit = defineEmits<{
  openChange: [open: boolean];
  "update:open": [open: boolean];
}>();

const contentRef = ref<HTMLElement | null>(null);

// 计算内容样式
const contentStyle = computed(() => {
  const style: Record<string, string> = {};

  // 如果没有位置信息，使用标准对话框样式
  if (!props.position) {
    // 设置默认宽度为 BaseModal 风格
    if (props.width === "auto") {
      style.width = "440px";
    } else if (typeof props.width === "number") {
      style.width = `${props.width}px`;
    } else {
      style.width = props.width;
    }
  } else {
    // 有位置信息时的自定义宽度处理
    if (typeof props.width === "number") {
      style.width = `${props.width}px`;
    } else if (props.width !== "auto") {
      style.width = props.width;
    }
  }

  // 设置最大宽高
  if (typeof props.maxWidth === "number") {
    style.maxWidth = `${props.maxWidth}px`;
  } else {
    style.maxWidth = props.maxWidth;
  }

  if (typeof props.maxHeight === "number") {
    style.maxHeight = `${props.maxHeight}px`;
  } else {
    style.maxHeight = props.maxHeight;
  }

  // 如果有位置信息，设置为固定位置
  if (props.position) {
    style.position = "fixed";
    style.left = `${props.position.x}px`;
    style.top = `${props.position.y}px`;
    style.transform = "none";
  }

  return style;
});

// 处理 overlay 点击
const handleOverlayClick = () => {
  if (props.closeOnClickOutside) {
    emit("openChange", false);
    emit("update:open", false);
  }
};

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && props.closeOnEscape && props.open) {
    emit("openChange", false);
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
  padding: 16px;
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

.dialog-content {
  background: var(--menu-bg);
  border: 1px solid var(--menu-border);
  border-radius: 12px;
  overflow: hidden;
  outline: none;
  display: flex;
  flex-direction: column;
  max-height: inherit;
}

/* 标准对话框模式样式 - 类似 BaseModal */
.dialog-content.dialog-modal {
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
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

/* Popover 模式样式 - 轻量级阴影 */
.dialog-content:not(.dialog-modal) {
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.15),
    0 16px 64px rgba(0, 0, 0, 0.1);
  animation: dialogFadeIn 0.2s ease;
}

@keyframes dialogFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 当有位置信息时，不使用 flex 居中 */
.dialog-overlay.positioned {
  align-items: flex-start;
  justify-content: flex-start;
  padding: 0;
  background: transparent;
}
</style>
