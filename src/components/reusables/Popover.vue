<template>
  <Teleport to="body" v-if="visible">
    <!-- 透明 overlay 覆盖整个视口 -->
    <div class="popover-overlay" @click="handleOverlayClick">
      <!-- 弹窗内容 -->
      <div
        ref="popoverRef"
        class="popover"
        :style="popoverStyle"
        :class="popoverClass"
        @click.stop
      >
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

interface Props {
  visible: boolean;
  position: { x: number; y: number; side?: string };
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  alignOffset?: number;
  width?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  className?: string;
  triggerElement?: HTMLElement | null;
}

const props = withDefaults(defineProps<Props>(), {
  align: "end",
  side: "bottom",
  sideOffset: 8,
  alignOffset: 0,
  width: "auto",
  maxWidth: "90vw",
  maxHeight: "80vh",
});

const emit = defineEmits<{
  clickOutside: [];
}>();

const popoverRef = ref<HTMLElement | null>(null);

// 计算弹窗位置和样式
const popoverStyle = computed(() => {
  const { x, y } = props.position;

  const style: Record<string, string> = {
    left: `${x}px`,
    top: `${y}px`,
  };

  // 设置宽度
  if (typeof props.width === "number") {
    style.width = `${props.width}px`;
  } else if (props.width !== "auto") {
    style.width = props.width;
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

  // 对于 align="end"，使用 transform 来右对齐
  if (
    props.align === "end" &&
    (props.side === "top" || props.side === "bottom")
  ) {
    style.transform = "translateX(-100%)";
  }

  // 对于 "top" 方向，需要让弹窗向上展开
  if (props.side === "top") {
    const currentTransform = style.transform || "";
    if (currentTransform.includes("translateX")) {
      style.transform = `${currentTransform} translateY(-100%)`;
    } else {
      style.transform = "translateY(-100%)";
    }
  }

  return style;
});

// 计算弹窗类名
const popoverClass = computed(() => {
  const classes = ["popover-content"];

  if (props.className) {
    classes.push(props.className);
  }

  // 添加方向类名用于动画
  classes.push(`popover-${props.side}`);
  classes.push(`popover-align-${props.align}`);

  return classes;
});

// 处理 overlay 点击
const handleOverlayClick = () => {
  emit("clickOutside");
};
</script>

<style scoped>
.popover-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: transparent;
}

.popover {
  position: fixed;
  z-index: 1000;
  background: var(--menu-bg);
  border: 1px solid var(--menu-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--menu-shadow);
  overflow: hidden;
}

/* 内容样式 */
.popover-content {
  /* 基础内容样式由具体使用组件定义 */
}
</style>
