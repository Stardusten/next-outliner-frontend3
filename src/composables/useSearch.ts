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

  // 重置搜索弹窗状态
  const resetSearch = () => {
    searchQuery.value = "";
    searchResults.value = [];
    activeIndex.value = 0;
  };

  const closeSearch = () => {
    searchVisible.value = false;
    resetSearch();
  }

  // 处理搜索结果选择
  const handleSearchSelect = (
    result: SearchResult | { type: string; index?: number }
  ) => {
    if ("type" in result) {
      // 处理导航事件
      if (result.type === "navigate" && typeof result.index === "number") {
        activeIndex.value = result.index;
      }
      return;
    }

    // 处理实际的搜索结果选择 - 使用 locateBlock 定位到选择的块
    const editor = getLastFocusedEditor(app);
    if (editor) {
      editorUtils.locateBlock(editor, result.block.id);
    }
    closeSearch();
  };

  // 更新搜索查询
  const updateSearchQuery = (query: string) => {
    performSearch(query);
  };

  return {
    searchVisible,
    searchQuery,
    searchResults,
    activeIndex,
    resetSearch,
    handleSearchSelect,
    updateSearchQuery,
    performSearch,
    closeSearch,
  };
}
