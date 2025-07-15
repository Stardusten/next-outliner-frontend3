<template>
  <Dialog v-model:open="searchVisible">
    <DialogTrigger>
      <Tooltip>
        <TooltipTrigger as-child>
          <slot />
        </TooltipTrigger>
        <TooltipContent>
          {{ $t("search.tooltip") }}
        </TooltipContent>
      </Tooltip>
    </DialogTrigger>

    <DialogContent
      class="max-w-[500px] max-h-[500px] p-0 gap-0"
      transparent-overlay
      @close-auto-focus.prevent
    >
      <DialogTitle class="hidden" />
      <!-- 搜索输入框 -->
      <div class="flex items-center gap-2 px-3 py-3 border-b">
        <Search :size="16" class="text-muted-foreground shrink-0" />
        <input
          ref="inputRef"
          v-model="searchQuery"
          class="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
          placeholder="搜索块内容..."
          @keydown="handleKeyDown"
          @input="handleInput"
          @compositionend="handleCompositionEnd"
        />
      </div>

      <!-- 搜索结果列表 -->
      <div class="max-h-[400px] overflow-y-auto" ref="listRef">
        <div
          v-for="(result, index) in searchResults"
          :key="result.block.id"
          :ref="(el) => setItemRef(el, index)"
          class="p-3 cursor-pointer border-b border-border/50 last:border-b-0 transition-colors hover:bg-muted/50"
          :class="{ 'bg-muted/50': index === activeIndex }"
          @click="selectResult(result)"
        >
          <div class="text-sm text-foreground overflow-hidden">
            <SearchResultItem
              :block="result.block"
              :app="app"
              :search-query="searchQuery"
            />
          </div>
          <div
            class="flex items-center justify-between mt-1 text-xs text-muted-foreground"
          >
            <span class="font-mono">{{ result.block.id.slice(0, 8) }}</span>
            <span
              v-if="result.score"
              class="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono"
            >
              {{ result.score.toFixed(2) }}
            </span>
          </div>
        </div>
        <div
          v-if="searchQuery && searchResults.length === 0"
          class="p-5 text-center text-sm text-muted-foreground"
        >
          没有找到匹配的块
        </div>
        <div
          v-if="!searchQuery"
          class="p-5 text-center text-sm text-muted-foreground italic"
        >
          输入关键词开始搜索
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue";
import { Search } from "lucide-vue-next";
import SearchResultItem from "./SearchResultItem.vue";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { BlockNode } from "@/lib/common/types";
import type { App } from "@/lib/app/app";
import type { useSearch } from "@/composables";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "../ui/tooltip";

interface SearchResult {
  block: BlockNode;
  score?: number;
}

const props = defineProps<{
  app: App;
  search: ReturnType<typeof useSearch>;
}>();

const {
  searchVisible,
  searchResults,
  searchQuery,
  activeIndex,
  handleSearchSelect,
  updateSearchQuery,
  performSearch,
  closeSearch,
} = props.search;

// DOM refs
const inputRef = ref<HTMLInputElement>();
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
  if (!listRef.value || activeIndex.value < 0 || !searchResults.value.length) {
    return;
  }

  await nextTick();

  const activeItem = itemRefs.value[activeIndex.value];
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
      if (searchResults.value.length > 0) {
        const nextIndex = Math.min(
          activeIndex.value + 1,
          searchResults.value.length - 1
        );
        handleSearchSelect({ type: "navigate", index: nextIndex } as any);
      }
      break;
    case "ArrowUp":
      e.preventDefault();
      if (searchResults.value.length > 0) {
        const prevIndex = Math.max(activeIndex.value - 1, 0);
        handleSearchSelect({ type: "navigate", index: prevIndex } as any);
      }
      break;
    case "Enter":
      e.preventDefault();
      if (searchResults.value[activeIndex.value]) {
        selectResult(searchResults.value[activeIndex.value]);
      }
      break;
    case "Escape":
      e.preventDefault();
      closeSearch();
      break;
  }
};

// 处理输入事件
const handleInput = (e: Event) => {
  // 检查是否正在输入法合成中
  if ((e as any).isComposing) {
    return;
  }

  updateSearchQuery(searchQuery.value);
  performSearch(searchQuery.value);
};

// 处理输入法合成结束事件
const handleCompositionEnd = () => {
  updateSearchQuery(searchQuery.value);
  performSearch(searchQuery.value);
};

// 选择搜索结果
const selectResult = (result: SearchResult) => {
  handleSearchSelect(result);
};

// 监听 activeIndex 变化，自动滚动
watch(() => activeIndex.value, scrollToActiveItem);

// 监听 visible 变化，聚焦输入框
watch(
  () => searchVisible.value,
  (visible) => {
    if (visible) {
      nextTick(() => {
        inputRef.value?.focus();
        scrollToActiveItem();
      });
    }
  }
);

// 同步外部搜索查询
watch(
  () => searchQuery.value,
  (newQuery) => {
    if (searchQuery.value !== newQuery) {
      searchQuery.value = newQuery;
    }
  }
);

onMounted(() => {
  if (searchVisible.value) {
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});
</script>
