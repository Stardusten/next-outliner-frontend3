import { ref, computed } from "vue";
import { searchBlocksWithScore } from "@/lib/app/index/fulltext";
import type { App } from "@/lib/app/app";
import type { BlockNode } from "@/lib/common/types";
import { getBlockNode } from "@/lib/app/block-manage";
import { getLastFocusedAppView } from "@/lib/app/views";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";

export interface SearchResult {
  block: BlockNode;
  score?: number;
}

export function useSearch(app: App) {
  const searchVisible = ref(false);
  const searchQuery = ref("");
  const searchResults = ref<SearchResult[]>([]);
  const activeIndex = ref(0);

  const performSearch = (query: string) => {
    if (!query.trim()) {
      searchResults.value = [];
      activeIndex.value = 0;
      return;
    }

    const searchResultsWithScore = searchBlocksWithScore(app, query, 100);
    const results: SearchResult[] = [];

    for (const { id, score } of searchResultsWithScore) {
      const blockNode = getBlockNode(app, id);
      if (blockNode) {
        const textContent = app.getTextContent(id, true); // 搜索时需要包含标签
        if (textContent && textContent.trim().length > 0) {
          results.push({ block: blockNode, score });
        }
      }
    }

    searchResults.value = results;
    activeIndex.value = 0;
  };

  /**
   * 防抖执行搜索
   */
  const DEBOUNCE_DELAY = 300; // ms
  let debounceTimer: number | undefined;
  const debouncedSearch = (query: string) => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      performSearch(query);
    }, DEBOUNCE_DELAY);
  };

  const setQuery = (query: string) => {
    searchQuery.value = query;
    debouncedSearch(query);
  };

  const setActiveIndex = (index: number) => {
    if (index >= 0 && index < searchResults.value.length) {
      activeIndex.value = index;
    }
  };

  const navigateDown = () => {
    if (searchResults.value.length > 0) {
      const nextIndex = Math.min(
        activeIndex.value + 1,
        searchResults.value.length - 1
      );
      setActiveIndex(nextIndex);
    }
  };

  const navigateUp = () => {
    if (searchResults.value.length > 0) {
      const prevIndex = Math.max(activeIndex.value - 1, 0);
      setActiveIndex(prevIndex);
    }
  };

  const selectCurrentItem = () => {
    const currentItem = searchResults.value[activeIndex.value];
    if (currentItem) {
      selectBlock(currentItem);
    }
  };

  const selectBlock = (result: SearchResult) => {
    const editor = getLastFocusedAppView(app);
    if (editor instanceof EditableOutlineView) {
      editor.locateBlock(result.block.id);
    }
    closeSearch();
  };

  const resetSearch = () => {
    searchQuery.value = "";
    searchResults.value = [];
    activeIndex.value = 0;
  };

  const closeSearch = () => {
    searchVisible.value = false;
    resetSearch();
  };

  return {
    // 状态
    searchVisible,
    searchQuery,
    searchResults,
    activeIndex,
    // 搜索功能
    setQuery,
    resetSearch,
    closeSearch,
    // 导航功能
    setActiveIndex,
    navigateDown,
    navigateUp,
    // 选择功能
    selectBlock,
    selectCurrentItem,
  };
}
