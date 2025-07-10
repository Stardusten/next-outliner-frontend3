<template>
  <div
    v-if="visible"
    class="fixed z-50 w-[350px] max-h-[400px] overflow-y-auto rounded-sm border bg-popover text-popover-foreground shadow-md"
    :style="popupStyle"
    ref="listRef"
  >
    <div
      v-for="(block, index) in blocks"
      :key="block.id"
      :ref="(el) => setItemRef(el, index)"
      class="relative flex w-full cursor-default select-none items-center px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground border-b border-border last:border-b-0"
      :class="{ 'bg-accent text-accent-foreground': index === activeIndex }"
      @click="selectBlock(block)"
    >
      <div class="flex-1 overflow-hidden text-foreground">
        <SearchResultItem :block="block" :app="app" :search-query="query" />
      </div>
    </div>
    <div
      v-if="blocks.length === 0"
      class="p-4 text-center text-sm text-muted-foreground"
    >
      没有找到匹配的块
    </div>
  </div>
</template>

<script setup lang="ts">
import type { App } from "@/lib/app/app";
import type { BlockNode } from "@/lib/common/types";
import { computed, nextTick, ref, watch } from "vue";
import SearchResultItem from "./search-popup/SearchResultItem.vue";

interface Props {
  visible: boolean;
  query: string;
  position: { x: number; y: number };
  blocks: BlockNode[];
  activeIndex: number;
  app: App;
}

interface Emits {
  (e: "select", block: BlockNode): void;
  (e: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// DOM refs
const listRef = ref<HTMLElement>();
const itemRefs = ref<Record<number, HTMLElement>>({});

// 设置项目ref
const setItemRef = (el: any, index: number) => {
  if (el && el instanceof HTMLElement) {
    itemRefs.value[index] = el;
  } else {
    delete itemRefs.value[index];
  }
};

// 滚动到选中项目
const scrollToActiveItem = async () => {
  if (!listRef.value || props.activeIndex < 0 || !props.blocks.length) {
    return;
  }

  await nextTick();

  const activeItem = itemRefs.value[props.activeIndex];
  if (!activeItem) {
    return;
  }

  // 使用 scrollIntoView API，更简单可靠
  activeItem.scrollIntoView({
    // behavior: "smooth",
    block: "nearest", // 只在必要时滚动，避免不必要的跳动
    inline: "nearest",
  });
};

// 监听 activeIndex 变化，自动滚动
watch(() => props.activeIndex, scrollToActiveItem);

// 监听 visible 变化，当弹窗显示时也滚动到选中项
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      scrollToActiveItem();
    }
  }
);

// 弹窗尺寸常量
const POPUP_WIDTH = 350;
const POPUP_MAX_HEIGHT = 300;
const LINE_HEIGHT = 30;
const POPUP_SPACING = 4;
const WINDOW_PADDING = 8;

// 计算弹窗最终的样式
const popupStyle = computed(() => {
  if (!props.visible) {
    return {} as Record<string, string>;
  }

  const { x, y } = props.position; // x,y 为当前行左下角的页面坐标
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const minPadding = 8;

  // 水平位置计算 ---------------------------------------------------------
  let left = x;

  // 检查右侧是否有足够空间
  if (left + POPUP_WIDTH > viewportWidth - minPadding) {
    // 右侧空间不足，向左调整
    left = viewportWidth - POPUP_WIDTH - minPadding;
  }

  // 确保不超出左边界
  left = Math.max(minPadding, left);

  // 垂直位置计算 ---------------------------------------------------------
  let top = y + POPUP_SPACING;
  let maxHeight = POPUP_MAX_HEIGHT;

  // 检查下方是否有足够空间
  const spaceBelow = viewportHeight - y - POPUP_SPACING - WINDOW_PADDING;
  const spaceAbove = y - LINE_HEIGHT - POPUP_SPACING - WINDOW_PADDING;

  if (spaceBelow < POPUP_MAX_HEIGHT && spaceAbove > spaceBelow) {
    // 下方空间不足且上方空间更大，向上弹出
    top = y - LINE_HEIGHT - POPUP_SPACING;
    maxHeight = Math.min(POPUP_MAX_HEIGHT, spaceAbove);
    // 使用 transform 让弹窗向上展开
    return {
      left: `${left}px`,
      top: `${top}px`,
      maxHeight: `${maxHeight}px`,
      transform: "translateY(-100%)",
    };
  } else {
    // 向下弹出（默认）
    maxHeight = Math.min(POPUP_MAX_HEIGHT, spaceBelow);
    return {
      left: `${left}px`,
      top: `${top}px`,
      maxHeight: `${maxHeight}px`,
    };
  }
});

// 选择块
function selectBlock(block: BlockNode) {
  emit("select", block);
}
</script>
