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

    <!-- [&>button]:hidden 隐藏关闭按钮 -->
    <DialogContent
      class="max-w-[500px] max-h-[500px] p-0 gap-0 [&>button]:hidden"
      transparent-overlay
      @close-auto-focus.prevent
    >
      <DialogTitle class="hidden" />
      <!-- 搜索输入框 -->
      <div class="flex items-center border-b">
        <div class="flex items-center justify-center w-10 h-[44px] shrink-0">
          <Search :size="16" class="text-muted-foreground" />
        </div>
        <input
          ref="inputRef"
          :value="searchQuery"
          class="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground h-[44px] px-2"
          placeholder="搜索块内容..."
          @keydown="handleKeyDown"
          @input="handleInput"
          @compositionend="handleCompositionEnd"
        />
        <div class="flex items-center gap-1 pr-2 shrink-0">
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="xs-icon"
                class="text-muted-foreground"
              >
                <Eye />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {{ $t("search.showPreview") }}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="xs-icon"
                class="text-muted-foreground"
              >
                <Settings2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {{ $t("search.editSearchOptions") }}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <!-- 搜索结果列表 -->
      <div class="max-h-[400px] overflow-y-auto" ref="listRef">
        <div
          v-for="(result, index) in searchResults"
          :key="result.block.id"
          :ref="(el) => setItemRef(el, index)"
          class="p-3 cursor-pointer border-b border-border/50 last:border-b-0 hover:bg-muted/50"
          :class="{ 'bg-muted/50': index === activeIndex }"
          @click="selectBlock(result)"
        >
          <SearchResultItem
            :block="result.block"
            :app="app"
            :search-query="searchQuery"
            class="text-sm **:text-nowrap! **:text-ellipsis! **:overflow-hidden!"
            show-path
          />
        </div>
        <div
          v-if="searchQuery && searchResults.length === 0"
          class="p-5 text-center text-sm text-muted-foreground"
        >
          {{ $t("search.noMatch") }}
        </div>
        <div
          v-if="!searchQuery"
          class="p-5 text-center text-sm text-muted-foreground italic"
        >
          {{ $t("search.noMatchDescription") }}
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { useSearch } from "@/composables";
import type { App } from "@/lib/app/app";
import { Eye, Search, Settings2 } from "lucide-vue-next";
import { nextTick, onMounted, ref, watch } from "vue";
import SearchResultItem from "../ReadonlyBlockView.vue";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const props = defineProps<{
  app: App;
  search: ReturnType<typeof useSearch>;
}>();

const {
  searchVisible,
  searchResults,
  searchQuery,
  activeIndex,
  setQuery,
  closeSearch,
  navigateDown,
  navigateUp,
  selectBlock,
  selectCurrentItem,
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
    block: "nearest", // 只在必要时滚动，避免不必要的跳动
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
      navigateDown();
      break;
    case "ArrowUp":
      e.preventDefault();
      navigateUp();
      break;
    case "Enter":
      e.preventDefault();
      selectCurrentItem();
      break;
    case "Escape":
      e.preventDefault();
      closeSearch();
      break;
  }
};

const handleInput = (e: Event) => {
  if ((e as any).isComposing) return;
  const value = (e.target as HTMLInputElement).value;
  setQuery(value);
};

const handleCompositionEnd = (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  setQuery(value);
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

onMounted(() => {
  if (searchVisible.value) {
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});
</script>
