<template>
  <div
    v-if="visible"
    class="search-popup"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
  >
    <!-- 搜索输入框 -->
    <div class="search-input-container">
      <Search :size="16" class="search-icon" />
      <input
        ref="inputRef"
        v-model="searchQuery"
        class="search-input"
        placeholder="搜索块内容..."
        @keydown="handleKeyDown"
        @input="handleInput"
        @compositionend="handleCompositionEnd"
      />
    </div>

    <!-- 搜索结果列表 -->
    <div class="search-list" ref="listRef">
      <div
        v-for="(result, index) in searchResults"
        :key="result.block.id"
        :ref="(el) => setItemRef(el, index)"
        class="search-item"
        :class="{ active: index === activeIndex }"
        @click="selectResult(result)"
      >
        <div class="block-content">{{ getBlockPreview(result.block) }}</div>
        <div class="block-meta">
          <span class="block-id">{{ result.block.id.slice(0, 8) }}</span>
          <span class="block-score" v-if="result.score">{{ result.score.toFixed(2) }}</span>
        </div>
      </div>
      <div v-if="searchQuery && searchResults.length === 0" class="search-empty">
        没有找到匹配的块
      </div>
      <div v-if="!searchQuery" class="search-placeholder">输入关键词开始搜索</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue";
import { Search } from "lucide-vue-next";
import type { Block } from "../lib/blocks/types";

interface SearchResult {
  block: Block;
  score?: number;
}

interface Props {
  visible: boolean;
  position: { x: number; y: number };
  searchResults: SearchResult[];
  activeIndex: number;
  searchQuery: string;
}

interface Emits {
  (e: "select", result: SearchResult): void;
  (e: "close"): void;
  (e: "update:searchQuery", query: string): void;
  (e: "search", query: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// DOM refs
const inputRef = ref<HTMLInputElement>();
const listRef = ref<HTMLElement>();
const itemRefs = ref<Record<number, HTMLElement>>({});

// 双向绑定搜索查询
const searchQuery = ref(props.searchQuery);

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
  if (!listRef.value || props.activeIndex < 0 || !props.searchResults.length) {
    return;
  }

  await nextTick();

  const activeItem = itemRefs.value[props.activeIndex];
  if (!activeItem) {
    return;
  }

  activeItem.scrollIntoView({
    block: "nearest",
    inline: "nearest",
  });
};

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
  // 检查是否正在输入法合成中
  if (e.isComposing || e.keyCode === 229) {
    return;
  }

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      if (props.searchResults.length > 0) {
        const nextIndex = Math.min(props.activeIndex + 1, props.searchResults.length - 1);
        emit("select", { type: "navigate", index: nextIndex } as any);
      }
      break;
    case "ArrowUp":
      e.preventDefault();
      if (props.searchResults.length > 0) {
        const prevIndex = Math.max(props.activeIndex - 1, 0);
        emit("select", { type: "navigate", index: prevIndex } as any);
      }
      break;
    case "Enter":
      e.preventDefault();
      if (props.searchResults[props.activeIndex]) {
        selectResult(props.searchResults[props.activeIndex]);
      }
      break;
    case "Escape":
      e.preventDefault();
      emit("close");
      break;
  }
};

// 处理输入事件
const handleInput = (e: Event) => {
  // 检查是否正在输入法合成中
  if ((e as any).isComposing) {
    return;
  }

  emit("update:searchQuery", searchQuery.value);
  emit("search", searchQuery.value);
};

// 处理输入法合成结束事件
const handleCompositionEnd = () => {
  emit("update:searchQuery", searchQuery.value);
  emit("search", searchQuery.value);
};

// 选择搜索结果
const selectResult = (result: SearchResult) => {
  emit("select", result);
};

// 获取块的预览文本
const getBlockPreview = (block: Block): string => {
  return block.textContent || "空白块";
};

// 监听 activeIndex 变化，自动滚动
watch(() => props.activeIndex, scrollToActiveItem);

// 监听 visible 变化，聚焦输入框
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      nextTick(() => {
        inputRef.value?.focus();
        scrollToActiveItem();
      });
    }
  },
);

// 同步外部搜索查询
watch(
  () => props.searchQuery,
  (newQuery) => {
    if (searchQuery.value !== newQuery) {
      searchQuery.value = newQuery;
    }
  },
);

onMounted(() => {
  if (props.visible) {
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});
</script>

<style scoped>
.search-popup {
  position: fixed;
  z-index: 1000;
  background: var(--menu-bg);
  border: 1px solid var(--menu-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--menu-shadow);
  width: 400px;
  max-height: 500px;
  overflow: hidden;
}

.search-input-container {
  padding: 4px 12px;
  border-bottom: 1px solid var(--menu-border);
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-icon {
  color: var(--menu-text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--menu-text);
  font-size: 14px;
  padding: 8px 0;
  font-family: inherit;
}

.search-input::placeholder {
  color: var(--menu-text-muted);
}

.search-list {
  max-height: 400px;
  overflow-y: auto;
}

.search-item {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color-muted);
  transition: background-color 0.15s ease;
}

.search-item:last-child {
  border-bottom: none;
}

.search-item:hover,
.search-item.active {
  background-color: var(--menu-item-hover);
}

.block-content {
  font-size: 14px;
  color: var(--menu-text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.block-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--menu-text-muted);
}

.block-id {
  font-family: monospace;
}

.block-score {
  font-size: 12px;
  color: var(--color-block-ref);
  background: var(--color-bg-hover);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.search-empty,
.search-placeholder {
  padding: 20px 12px;
  text-align: center;
  color: var(--menu-text-muted);
  font-size: 14px;
}

.search-placeholder {
  font-style: italic;
}
</style>
