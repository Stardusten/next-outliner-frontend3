import { ref, computed } from "vue";
import type { FullTextIndex } from "@/lib/app/index/fulltext";
import { locateBlock, type Editor } from "@/lib/editor/editor";
import type { App } from "@/lib/app/app";
import type { BlockNode } from "@/lib/common/types";

export interface SearchResult {
  block: BlockNode;
  score?: number;
}

export function useSearch(app: App) {
  const searchVisible = ref(false);
  const searchQuery = ref("");
  const searchResults = ref<SearchResult[]>([]);
  const activeIndex = ref(0);
  const searchPosition = ref({ x: 0, y: 0 });

  // 计算搜索弹窗位置（居中显示）
  const calculateSearchPosition = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = 400;
    const popupHeight = 500;

    searchPosition.value = {
      x: (viewportWidth - popupWidth) / 2,
      y: Math.max(50, (viewportHeight - popupHeight) / 2),
    };
  };

  // 执行搜索
  const performSearch = (query: string) => {
    searchQuery.value = query;

    if (!query.trim()) {
      searchResults.value = [];
      activeIndex.value = 0;
      return;
    }

    // 使用全文索引搜索，获取带分数的结果
    const searchResultsWithScore = app.searchWithScore(query, 100);

    const results: SearchResult[] = [];
    for (const { id, score } of searchResultsWithScore) {
      const blockNode = app.getBlockNode(id);
      if (blockNode) {
        const textContent = app.getTextContent(id);
        if (textContent && textContent.trim().length > 0) {
          results.push({ block: blockNode, score });
        }
      }
    }

    searchResults.value = results;
    activeIndex.value = 0;
  };

  // 显示搜索弹窗
  const showSearch = () => {
    calculateSearchPosition();
    searchVisible.value = true;
    searchQuery.value = "";
    searchResults.value = [];
    activeIndex.value = 0;
  };

  // 隐藏搜索弹窗
  const hideSearch = () => {
    searchVisible.value = false;
    searchQuery.value = "";
    searchResults.value = [];
    activeIndex.value = 0;
  };

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
    const editor = app.getLastFocusedEditor();
    if (editor) {
      locateBlock(editor, result.block.id);
    }
    hideSearch();
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
    searchPosition,
    showSearch,
    hideSearch,
    handleSearchSelect,
    updateSearchQuery,
    performSearch,
  };
}
