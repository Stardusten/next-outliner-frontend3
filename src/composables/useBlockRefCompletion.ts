import type { Block } from "@/lib/blocks/types";
import type { FullTextIndex } from "@/lib/index/fulltext";
import type { CompletionStatus, Editor, EditorEvent } from "@/lib/editor/interface";
import type { BlockStorage } from "@/lib/storage/interface";
import { onMounted, ref } from "vue";

export function useBlockRefCompletion(
  getEditor: () => Editor,
  getBlockStorage: () => BlockStorage,
  getFullTextIndex: () => FullTextIndex,
) {
  // 补全相关状态
  const completionVisible = ref(false);
  const completionQuery = ref("");
  const completionPosition = ref({ x: 0, y: 0 });
  const availableBlocks = ref<Block[]>([]);
  const completionActiveIndex = ref(0);

  // 编辑器事件处理
  const handleCompletionRelatedEvent = (event: EditorEvent) => {
    switch (event.type) {
      case "completion":
        handleCompletionEvent(event.status);
        break;
      case "completion-next":
        handleCompletionNext();
        break;
      case "completion-prev":
        handleCompletionPrev();
        break;
      case "completion-select":
        handleCompletionSelect();
        break;
    }
  };

  // 处理补全事件
  const handleCompletionEvent = (status: CompletionStatus | null) => {
    const editor = getEditor();

    if (status) {
      // 显示补全窗口
      completionVisible.value = true;
      completionQuery.value = status.query;

      // 计算弹窗位置
      const coords = editor.coordAtPos(status.from);
      completionPosition.value = {
        x: coords.left,
        y: coords.bottom + 4,
      };

      // 获取可用的块列表
      loadAvailableBlocks(status.query);

      // 重置选中索引
      completionActiveIndex.value = 0;
    } else {
      // 隐藏补全窗口
      completionVisible.value = false;
      completionQuery.value = "";
      completionActiveIndex.value = 0;
    }
  };

  // 加载可用的块列表
  const loadAvailableBlocks = (query?: string) => {
    const fulltextIndex = getFullTextIndex();
    const blockStorage = getBlockStorage();

    const blocks: Block[] = [];
    if (query && query.trim()) {
      // 使用全文搜索查找匹配的块
      const searchResults = fulltextIndex.search(query, 10);

      // 根据搜索结果获取具体的块
      for (const blockId of searchResults) {
        const blockLoaded = blockStorage.getBlock(blockId);
        if (blockLoaded) {
          const block = blockLoaded.get();
          if (block.textContent && block.textContent.trim().length > 0) {
            blocks.push(block);
          }
        }
      }
    } else {
      // 没有查询时，显示最近的一些块
      let count = 0;
      blockStorage.forEachBlock((blockLoaded) => {
        if (count >= 10) return false; // 最多显示10个

        const block = blockLoaded.get();
        if (block.textContent && block.textContent.trim().length > 0) {
          blocks.push(block);
          count++;
        }
        return true;
      });
    }

    availableBlocks.value = blocks;
  };

  // 补全相关函数
  const handleBlockSelect = (block: Block) => {
    // 插入选中的块引用
    getEditor().executeComplete(block.id);
    // 关闭补全窗口
    completionVisible.value = false;
  };

  const handleCompletionClose = () => {
    // 关闭补全窗口
    completionVisible.value = false;
  };

  // 处理补全导航事件
  const handleCompletionNext = () => {
    completionActiveIndex.value = Math.min(
      completionActiveIndex.value + 1,
      availableBlocks.value.length - 1,
    );
  };

  const handleCompletionPrev = () => {
    completionActiveIndex.value = Math.max(completionActiveIndex.value - 1, 0);
  };

  const handleCompletionSelect = () => {
    const selectedBlock = availableBlocks.value[completionActiveIndex.value];
    if (selectedBlock) {
      handleBlockSelect(selectedBlock);
    }
  };

  return {
    completionVisible,
    completionQuery,
    completionPosition,
    availableBlocks,
    completionActiveIndex,
    handleBlockSelect,
    handleCompletionClose,
    handleCompletionRelatedEvent,
  };
}
