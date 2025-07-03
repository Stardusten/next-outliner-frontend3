import {
  coordAtPos,
  getFocusedBlockId,
  type CompletionStatus,
  type Editor,
  type EditorEvents,
} from "@/lib/editor/editor";
import { onMounted, ref } from "vue";
import { outlinerSchema } from "@/lib/editor/schema";
import type { App } from "@/lib/app/app";
import type { BlockDataInner, BlockNode } from "@/lib/common/types";
import { executeCompletion } from "@/lib/editor/plugins/block-ref-completion";
import { searchBlocks } from "@/lib/app/index/fulltext";
import { getFocusingEditor } from "@/lib/app/editors";
import { getAllNodes, getBlockNode } from "@/lib/app/block-manage";
import { getTextContent } from "@/lib/app/index/text-content";

function isSingleRefBlock(block: BlockNode) {
  const data = block.data.toJSON() as BlockDataInner;
  const nodeJson = JSON.parse(data.content);
  const node = outlinerSchema.nodeFromJSON(nodeJson);
  if (!node || node.type !== outlinerSchema.nodes.paragraph) return false;

  if (node.content.size === 1) {
    const fst = node.firstChild;
    if (fst && fst.type === outlinerSchema.nodes.blockRef) {
      return true;
    }
  }
  return false;
}

export function useBlockRefCompletion(app: App) {
  // 补全相关状态
  const completionVisible = ref(false);
  const completionQuery = ref("");
  const completionPosition = ref({ x: 0, y: 0 });
  const availableBlocks = ref<BlockNode[]>([]);
  const completionActiveIndex = ref(0);

  // 编辑器事件处理
  function handleCompletionRelatedEvent(
    editor: Editor,
    key: keyof EditorEvents,
    event: EditorEvents[keyof EditorEvents]
  ) {
    switch (key) {
      case "completion":
        handleCompletionEvent(
          editor,
          (event as EditorEvents["completion"]).status
        );
        break;
      case "completion-next":
        handleCompletionNext();
        break;
      case "completion-prev":
        handleCompletionPrev();
        break;
      case "completion-select":
        handleCompletionSelect(editor);
        break;
    }
  }

  // 处理补全事件
  const handleCompletionEvent = (
    editor: Editor,
    status: CompletionStatus | null
  ) => {
    if (status) {
      // 显示补全窗口
      completionVisible.value = true;
      completionQuery.value = status.query;

      // 计算弹窗位置
      const coords = coordAtPos(editor, status.from);
      completionPosition.value = {
        x: coords.left,
        y: coords.bottom + 4,
      };

      // 获取可用的块列表
      loadAvailableBlocks(editor, status.query);

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
  const loadAvailableBlocks = (editor: Editor, query?: string) => {
    const blocks: BlockNode[] = [];
    if (query && query.trim()) {
      // 使用全文搜索查找匹配的块
      const searchResults = searchBlocks(app, query, 100);

      const focusedEditor = getFocusingEditor(app);
      const focusedBlockId = focusedEditor
        ? getFocusedBlockId(focusedEditor)
        : null;

      // 根据搜索结果获取具体的块
      for (const blockId of searchResults) {
        const blockNode = getBlockNode(app, blockId);
        if (blockNode) {
          if (blockNode.data.get("type") !== "text") continue;
          const textContent = getTextContent(app, blockId);
          if (textContent && textContent.trim().length > 0) {
            // 当前块永远不会成为候选
            if (focusedBlockId && blockNode.id === focusedBlockId) continue;
            // 只包含一个块引用的块不会成为候选，比如 “[[小说]]” 这种
            // 因为这会与其原身混淆
            if (isSingleRefBlock(blockNode)) continue;
            blocks.push(blockNode);
          }
        }
      }
    } else {
      // 没有查询时，显示最近的一些块
      let count = 0;
      for (const blockNode of getAllNodes(app)) {
        if (count >= 10) return false; // 最多显示10个

        const textContent = getTextContent(app, blockNode.id);
        if (textContent && textContent.trim().length > 0) {
          blocks.push(blockNode);
          count++;
        }
        return true;
      }
    }

    availableBlocks.value = blocks;
  };

  // 补全相关函数
  const handleBlockSelect = (editor: Editor, block: BlockNode) => {
    // 插入选中的块引用
    editor.view && executeCompletion(block.id, editor.view);
    // 关闭补全窗口
    completionVisible.value = false;
  };

  const handleCompletionClose = () => {
    // 关闭补全窗口
    completionVisible.value = false;
  };

  // 处理补全导航事件
  const handleCompletionNext = () => {
    if (availableBlocks.value.length === 0) return;
    completionActiveIndex.value =
      (completionActiveIndex.value + 1) % availableBlocks.value.length;
  };

  const handleCompletionPrev = () => {
    if (availableBlocks.value.length === 0) return;
    completionActiveIndex.value = completionActiveIndex.value - 1;
    if (completionActiveIndex.value < 0) {
      completionActiveIndex.value = availableBlocks.value.length - 1;
    }
  };

  const handleCompletionSelect = (editor: Editor) => {
    const selectedBlock = availableBlocks.value[completionActiveIndex.value];
    if (selectedBlock) {
      handleBlockSelect(editor, selectedBlock);
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
