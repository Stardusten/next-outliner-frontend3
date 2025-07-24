import { ref, computed } from "vue";
import { searchBlocksWithScore } from "@/lib/app/index/fulltext";
import { editorUtils, type Editor } from "@/lib/editor/editor";
import type { App } from "@/lib/app/app";
import type { BlockNode } from "@/lib/common/types";
import { getBlockNode } from "@/lib/app/block-manage";
import { getTextContent } from "@/lib/app/index/text-content";
import { getLastFocusedEditor } from "@/lib/app/editors";

export interface SearchResult {
  block: BlockNode;
  score?: number;
}

export function useSearch(app: App) {
  const searchVisible = ref(false);
  const searchQuery = ref("");
  const searchResults = ref<SearchResult[]>([]);
  const activeIndex = ref(0);

  // 执行搜索
  const performSearch = (query: string) => {
    searchQuery.value = query;

    if (!query.trim()) {
      searchResults.value = [];
      activeIndex.value = 0;
      return;
    }

    // 使用全文索引搜索，获取带分数的结果
    const searchResultsWithScore = searchBlocksWithScore(app, query, 100);

    const results: SearchResult[] = [];
    for (const { id, score } of searchResultsWithScore) {
      const blockNode = getBlockNode(app, id);
      if (blockNode) {
        const textContent = getTextContent(app, id);
        if (textContent && textContent.trim().length > 0) {
          results.push({ block: blockNode, score });
        }
      }
    }

    searchResults.value = results;
    activeIndex.value = 0;
  };

  // 设置活动索引（用于键盘导航）
  const setActiveIndex = (index: number) => {
    if (index >= 0 && index < searchResults.value.length) {
      activeIndex.value = index;
    }
  };

  // 导航到下一项
  const navigateDown = () => {
    if (searchResults.value.length > 0) {
      const nextIndex = Math.min(
        activeIndex.value + 1,
        searchResults.value.length - 1
      );
      setActiveIndex(nextIndex);
    }
  };

  // 导航到上一项
  const navigateUp = () => {
    if (searchResults.value.length > 0) {
      const prevIndex = Math.max(activeIndex.value - 1, 0);
      setActiveIndex(prevIndex);
    }
  };

  // 选择当前活动项
  const selectCurrentItem = () => {
    const currentItem = searchResults.value[activeIndex.value];
    if (currentItem) {
      selectBlock(currentItem);
    }
  };

  // 选择指定的块
  const selectBlock = (result: SearchResult) => {
    const editor = getLastFocusedEditor(app);
    if (editor) {
      editorUtils.locateBlock(editor, result.block.id);
    }
    closeSearch();
  };

  // 重置搜索弹窗状态
  const resetSearch = () => {
    searchQuery.value = "";
    searchResults.value = [];
    activeIndex.value = 0;
  };

  // 关闭搜索弹窗
  const closeSearch = () => {
    searchVisible.value = false;
    resetSearch();
  };

  // 更新搜索查询
  const updateSearchQuery = (query: string) => {
    performSearch(query);
  };

  return {
    // 状态
    searchVisible,
    searchQuery,
    searchResults,
    activeIndex,
    // 搜索功能
    performSearch,
    updateSearchQuery,
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
