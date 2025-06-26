<template>
  <div
    v-if="visible"
    class="completion-popup"
    :style="{ left: adjustedPosition.x + 'px', top: adjustedPosition.y + 'px' }"
  >
    <div class="completion-header">
      <span class="completion-title">插入块引用</span>
      <span class="completion-query" v-if="query">{{ query }}</span>
    </div>
    <div class="completion-list" ref="listRef">
      <div
        v-for="(block, index) in filteredBlocks"
        :key="block.id"
        :ref="(el) => setItemRef(el, index)"
        class="completion-item"
        :class="{ active: index === activeIndex }"
        @click="selectBlock(block)"
      >
        <div class="completion-item-content">
          <SearchResultItem
            :block="block"
            :storage="app"
            :search-query="query"
          />
        </div>
        <div class="block-meta">{{ block.id.slice(0, 8) }}</div>
      </div>
      <div v-if="filteredBlocks.length === 0" class="completion-empty">
        没有找到匹配的块
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import SearchResultItem from "./SearchResultItem.vue";
import type { BlockNode } from "@/lib/common/types";
import type { App } from "@/lib/app/app";

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
  if (!listRef.value || props.activeIndex < 0 || !filteredBlocks.value.length) {
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
const POPUP_MAX_HEIGHT = 400;
const LINE_HEIGHT = 30;
const POPUP_SPACING = 4; // 弹窗与触发位置的间距

// 过滤匹配的块
const filteredBlocks = computed(() => {
  // 块列表已经通过全文搜索过滤和排序，直接使用
  return props.blocks.slice(0, 10);
});

// 计算调整后的位置，智能选择弹出方向并防止超出可视范围
const adjustedPosition = computed(() => {
  if (!props.visible) {
    return props.position;
  }

  const { x, y } = props.position; // x,y 是当前行中元素的左下角
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX || 0;
  const scrollY = window.scrollY || 0;

  let adjustedX = x;
  let adjustedY = y;

  // 使用固定的最大高度进行位置计算，避免因内容变化导致位置跳动
  const fixedHeight = POPUP_MAX_HEIGHT;

  // 垂直位置计算 - 智能选择上方或下方
  const spaceBelow = viewportHeight - (y - scrollY);
  const spaceAbove = y - scrollY - LINE_HEIGHT;

  if (spaceBelow >= fixedHeight + POPUP_SPACING) {
    // 下方空间足够，在当前行下方显示
    adjustedY = y + POPUP_SPACING;
  } else if (spaceAbove >= fixedHeight + POPUP_SPACING) {
    // 下方空间不够但上方空间足够，在当前行上方显示
    adjustedY = y - LINE_HEIGHT - fixedHeight - POPUP_SPACING;
  } else {
    // 上下空间都不够，选择空间较大的一方，并调整到边界
    if (spaceBelow > spaceAbove) {
      // 下方空间较大，贴底显示
      adjustedY = viewportHeight + scrollY - fixedHeight - 8;
    } else {
      // 上方空间较大，贴顶显示
      adjustedY = scrollY + 8;
    }
  }

  // 水平位置计算 - 优先右侧弹出，避免向左弹出
  const spaceRight = viewportWidth - (x - scrollX);
  const minPadding = 8; // 最小边距

  if (spaceRight >= POPUP_WIDTH + minPadding) {
    // 右侧空间足够，保持原位置
    adjustedX = x;
  } else {
    // 右侧空间不够，将弹窗往左移动，确保完全显示
    // 计算需要往左移动多少才能完全显示
    const overflowAmount =
      x + POPUP_WIDTH - (viewportWidth + scrollX - minPadding);
    adjustedX = x - overflowAmount;

    // 确保不会移动到左边界之外
    const leftBoundary = scrollX + minPadding;
    if (adjustedX < leftBoundary) {
      adjustedX = leftBoundary;
    }
  }

  // 确保垂直方向不超出边界
  adjustedY = Math.max(
    scrollY + 8,
    Math.min(adjustedY, viewportHeight + scrollY - fixedHeight - 8)
  );

  return { x: adjustedX, y: adjustedY };
});

// 选择块
function selectBlock(block: BlockNode) {
  emit("select", block);
}
</script>

<style scoped>
.completion-popup {
  position: fixed;
  z-index: 1000;
  background: var(--menu-bg);
  border: 1px solid var(--menu-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--menu-shadow);
  width: 350px;
  max-height: 400px;
  overflow: hidden;
  font-size: var(--ui-font-size);
}

.completion-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--menu-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.completion-title {
  font-size: var(--ui-font-size-small);
  color: var(--menu-text-muted);
  font-weight: 500;
}

.completion-query {
  font-size: var(--ui-font-size-small);
  color: var(--color-block-ref);
  background: var(--color-bg-hover);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.completion-list {
  max-height: 360px;
  overflow-y: auto;
}

.completion-item {
  font-size: var(--ui-font-size);
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color-muted);
  transition: background-color 0.15s ease;
}

.completion-item:last-child {
  border-bottom: none;
}

.completion-item:hover,
.completion-item.active {
  background-color: var(--menu-item-hover);
}

.completion-item-content {
  color: var(--menu-text);
  overflow: hidden;
}

.block-meta {
  font-size: var(--ui-font-size-tiny);
  color: var(--menu-text-muted);
  font-family: monospace;
}

.completion-empty {
  padding: 16px 12px;
  text-align: center;
  color: var(--menu-text-muted);
  font-size: var(--ui-font-size);
}
</style>
