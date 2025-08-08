import type { App } from "@/lib/app/app";
import { getBlockNode } from "@/lib/app/block-manage";
import { getTextContent } from "@/lib/app/index/text-content";
import { getLastFocusedAppView } from "@/lib/app/views";
import { type BlockId, type BlockNode } from "@/lib/common/types";
import {
  moveBlocksTo,
  moveBlockTo,
} from "@/lib/app-views/editable-outline/commands";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";
import { i18n } from "@/main";
import { ref, computed } from "vue";
import { toast } from "vue-sonner";

// 为了演示效果，添加一些测试数据（使用正确的 TreeID 格式）
const blockCutted = ref<BlockId[]>([]);

export function useBlockClipboard(app: App) {
  const { t } = i18n.global;

  const blockNodesCutted = computed(() => {
    const res: BlockNode[] = [];
    for (const blockId of blockCutted.value) {
      const blockNode = getBlockNode(app, blockId);
      blockNode && res.push(blockNode);
    }
    return res;
  });

  // 添加块到剪贴板
  const addBlock = (blockId: BlockId) => {
    const text = getTextContent(app, blockId);
    if (!blockCutted.value.includes(blockId)) {
      blockCutted.value.push(blockId);
      toast.success(t("clipboardPopup.blockCutted", { content: text ?? "" }));
    } else {
      toast.warning(
        t("clipboardPopup.blockAlreadyExists", { content: text ?? "" })
      );
    }
  };

  // 从剪贴板移除特定块
  const removeBlock = (blockId: BlockId) => {
    const index = blockCutted.value.indexOf(blockId);
    if (index > -1) {
      blockCutted.value.splice(index, 1);
    }
  };

  // 清空剪贴板
  const removeAllBlocks = () => {
    blockCutted.value = [];
  };

  const _getFocusedInfo = () => {
    const appView = getLastFocusedAppView(app);
    if (!appView || !(appView instanceof EditableOutlineView)) {
      toast.warning(t("clipboardPopup.noAppFocused"));
      return;
    }

    const focused = appView.getFocusedBlockId();
    if (!focused) {
      toast.warning(t("clipboardPopup.noAppFocused"));
      return;
    }

    const focusedBlockNode = getBlockNode(app, focused);
    if (!focusedBlockNode) return;

    // 移动到当前聚焦的块下方
    const parent = focusedBlockNode.parent()?.id ?? null;
    const index = focusedBlockNode.index()!;
    return { appView, parent, index };
  };

  // 粘贴块到指定位置（这里只是一个占位实现）
  const pasteBlock = (blockId: BlockId) => {
    const info = _getFocusedInfo();
    if (!info) return;
    const { appView, parent, index } = info;

    const cmd = moveBlockTo(appView.tiptap!, blockId, parent, index + 1);
    appView.execCommand(cmd, true);
    removeBlock(blockId);

    const text = getTextContent(app, blockId);
    toast.success(t("clipboardPopup.blockPasted", { content: text ?? "" }));
  };

  // 粘贴所有块到指定位置
  const pasteAllBlocks = (targetPosition?: any) => {
    const info = _getFocusedInfo();
    if (!info) return;
    const { appView, parent, index } = info;
    const n = blockNodesCutted.value.length;

    const cmd = moveBlocksTo(
      appView.tiptap!,
      blockCutted.value,
      parent,
      index + 1
    );
    appView.execCommand(cmd, true);
    removeAllBlocks();

    toast.success(t("clipboardPopup.blocksPasted", { n }));
  };

  return {
    blockCutted,
    blockNodesCutted,
    addBlock,
    removeBlock,
    removeAllBlocks,
    pasteBlock,
    pasteAllBlocks,
  };
}
