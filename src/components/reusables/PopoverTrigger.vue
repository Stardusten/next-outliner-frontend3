<template>
  <div class="popover-trigger" ref="triggerRef">
    <!-- 触发器内容 -->
    <div @click="handleTriggerClick">
      <slot name="trigger" :open="open" />
    </div>

    <!-- 弹窗内容 -->
    <Popover
      :visible="open"
      :position="popoverPosition"
      :align="align"
      :side="popoverPosition.side"
      :side-offset="sideOffset"
      :align-offset="alignOffset"
      :width="width"
      :max-width="maxWidth"
      :max-height="maxHeight"
      :trigger-element="triggerRef"
      @clickOutside="handleClickOutside"
    >
      <slot :open="open" :close="close" />
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import Popover from "./Popover.vue";

interface Props {
  // 弹窗配置
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  alignOffset?: number;
  width?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;

  // 行为配置
  closeOnClickOutside?: boolean;
  defaultOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  align: "end",
  side: "bottom",
  sideOffset: 8,
  alignOffset: 0,
  width: "auto",
  maxWidth: "90vw",
  maxHeight: "80vh",
  closeOnClickOutside: true,
  defaultOpen: false,
});

const emit = defineEmits<{
  openChange: [open: boolean];
}>();

// 状态管理
const open = ref(props.defaultOpen);
const triggerRef = ref<HTMLElement | null>(null);

// 计算弹窗位置
const popoverPosition = computed(() => {
  if (!triggerRef.value) {
    return { x: 0, y: 0, side: props.side };
  }

  const rect = triggerRef.value.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // 估算弹窗尺寸（用于视口检测）
  const estimatedPopoverHeight = 400; // 最大高度估算
  const estimatedPopoverWidth = 300; // 估算宽度

  // 根据 side 和 align 计算基础位置
  let x = rect.left;
  let y = rect.top;
  let actualSide = props.side;

  // 首先按照原始 side 计算位置
  switch (props.side) {
    case "bottom":
      y = rect.bottom + props.sideOffset;
      // 检查是否会超出视口底部
      if (y + estimatedPopoverHeight > viewport.height) {
        // 尝试向上弹出
        const topY = rect.top - props.sideOffset;
        if (topY - estimatedPopoverHeight >= 0) {
          y = topY;
          actualSide = "top";
        }
      }
      // 根据对齐方式调整 x 坐标
      if (props.align === "end") {
        x = rect.right;
      } else if (props.align === "center") {
        x = rect.left + rect.width / 2;
      } else {
        x = rect.left;
      }
      break;
    case "top":
      y = rect.top - props.sideOffset;
      // 检查是否会超出视口顶部（考虑弹窗会向上展开）
      if (y - estimatedPopoverHeight < 0) {
        // 尝试向下弹出
        const bottomY = rect.bottom + props.sideOffset;
        if (bottomY + estimatedPopoverHeight <= viewport.height) {
          y = bottomY;
          actualSide = "bottom";
        }
      }
      // 根据对齐方式调整 x 坐标
      if (props.align === "end") {
        x = rect.right;
      } else if (props.align === "center") {
        x = rect.left + rect.width / 2;
      } else {
        x = rect.left;
      }
      break;
    case "right":
      x = rect.right + props.sideOffset;
      y = rect.top;
      // 检查是否会超出视口右侧
      if (x + estimatedPopoverWidth > viewport.width) {
        // 尝试向左弹出
        const leftX = rect.left - props.sideOffset;
        if (leftX - estimatedPopoverWidth >= 0) {
          x = leftX;
          actualSide = "left";
        }
      }
      break;
    case "left":
      x = rect.left - props.sideOffset;
      y = rect.top;
      // 检查是否会超出视口左侧
      if (x - estimatedPopoverWidth < 0) {
        // 尝试向右弹出
        const rightX = rect.right + props.sideOffset;
        if (rightX + estimatedPopoverWidth <= viewport.width) {
          x = rightX;
          actualSide = "right";
        }
      }
      break;
    default:
      y = rect.bottom + props.sideOffset;
      // 检查是否会超出视口底部
      if (y + estimatedPopoverHeight > viewport.height) {
        const topY = rect.top - props.sideOffset;
        if (topY - estimatedPopoverHeight >= 0) {
          y = topY;
          actualSide = "top";
        }
      }
      if (props.align === "end") {
        x = rect.right;
      } else if (props.align === "center") {
        x = rect.left + rect.width / 2;
      } else {
        x = rect.left;
      }
      break;
  }

  // 应用 alignOffset
  x += props.alignOffset;

  return { x, y, side: actualSide };
});

// 处理触发器点击
const handleTriggerClick = () => {
  open.value = !open.value;
  emit("openChange", open.value);
};

// 处理点击外部
const handleClickOutside = () => {
  if (props.closeOnClickOutside && open.value) {
    open.value = false;
    emit("openChange", open.value);
  }
};

// 手动控制方法
const close = () => {
  open.value = false;
  emit("openChange", open.value);
};

const toggle = () => {
  open.value = !open.value;
  emit("openChange", open.value);
};

// 暴露方法给父组件
defineExpose({
  close,
  toggle,
  triggerRef,
});
</script>

<style scoped>
.popover-trigger {
  display: inline-block;
}
</style>
