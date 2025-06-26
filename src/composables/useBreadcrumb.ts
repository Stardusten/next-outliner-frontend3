import type { Editor, EditorEvent } from "@/lib/editor/interface";
import { useLocalStorage } from "./useLocalStorage";
import type { BlockId, BlockNode } from "@/lib/common/types";
import type { App } from "@/lib/app/app";
import { computed } from "vue";

const ROOT_BLOCKS_KEY = "pm-editor-root-blocks";

export interface BreadcrumbItem {
  blockId?: BlockId;
  title: string;
}

export function useBreadcrumb(
  getEditor: () => Editor,
  getBlockStorage: () => App
) {
  const [rootBlockIds, setRootBlockIds] = useLocalStorage<BlockId[]>(
    ROOT_BLOCKS_KEY,
    []
  );

  const breadcrumbItems = computed((): BreadcrumbItem[] => {
    const app = getBlockStorage();
    const items: BreadcrumbItem[] = [{ title: "我的笔记" }];

    if (rootBlockIds.value.length === 1) {
      const rootBlockId = rootBlockIds.value[0];
      const rootBlock = app.getBlockNode(rootBlockId);
      if (rootBlock) {
        const path: BlockId[] = [];
        let currentBlock: BlockNode | null = rootBlock;

        while (currentBlock) {
          path.unshift(currentBlock.id);
          currentBlock = currentBlock.parent() ?? null;
        }

        path.forEach((blockId) => {
          const block = app.getBlockNode(blockId);
          if (block) {
            const title =
              app.getTextContent(blockId) || `块 ${blockId.slice(0, 8)}`;
            items.push({ blockId, title });
          }
        });
      }
    } else if (rootBlockIds.value.length > 1) {
      items.push({ title: "多个块" });
    }

    return items;
  });

  const handleBreadcrumbClick = (item: BreadcrumbItem): void => {
    const editor = getEditor();
    if (item.blockId) {
      editor.setRootBlocks([item.blockId]);
    } else {
      editor.setRootBlocks([]);
    }
  };

  const handleEditorEvent = (event: EditorEvent): void => {
    if (event.type === "root-blocks-changed") {
      setRootBlockIds(event.rootBlockIds);
    }
  };

  return {
    rootBlockIds,
    breadcrumbItems,
    handleBreadcrumbClick,
    handleEditorEvent,
  };
}
