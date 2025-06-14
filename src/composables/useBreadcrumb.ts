import { computed } from "vue";
import type { BlockId, BlockLoaded } from "@/lib/blocks/types";
import type { Editor, EditorEvent } from "@/lib/editor/interface";
import type { BlockStorage } from "@/lib/storage/interface";
import { useLocalStorage } from "./useLocalStorage";

const ROOT_BLOCKS_KEY = "pm-editor-root-blocks";

export interface BreadcrumbItem {
  blockId?: BlockId;
  title: string;
}

export function useBreadcrumb(getEditor: () => Editor, getBlockStorage: () => BlockStorage) {
  const [rootBlockIds, setRootBlockIds] = useLocalStorage<BlockId[]>(ROOT_BLOCKS_KEY, []);

  const breadcrumbItems = computed((): BreadcrumbItem[] => {
    const blockStorage = getBlockStorage();
    const items: BreadcrumbItem[] = [{ title: "我的笔记" }];

    if (rootBlockIds.value.length === 1) {
      const rootBlockId = rootBlockIds.value[0];
      const rootBlock = blockStorage.getBlock(rootBlockId);
      if (rootBlock) {
        const path: BlockId[] = [];
        let currentBlock: BlockLoaded | null = rootBlock;

        while (currentBlock) {
          path.unshift(currentBlock.get().id);
          currentBlock = currentBlock.get().parentBlock;
        }

        path.forEach((blockId) => {
          const block = blockStorage.getBlock(blockId);
          if (block) {
            const title = block.get().textContent || `块 ${blockId.slice(0, 8)}`;
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
