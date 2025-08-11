import type {
  EditableOutlineView,
  EditableOutlineViewEvents,
} from "@/lib/app-views/editable-outline/editable-outline";
import type { App } from "@/lib/app/app";
import { getBlockNode } from "@/lib/app/block-manage";
import type { BlockId, BlockNode } from "@/lib/common/types";
import type { RepoConfig } from "@/lib/repo/schema";
import { computed } from "vue";
import { useMainEditorRoots } from "./useMainEditorRoots";

const ROOT_BLOCKS_KEY = "pm-editor-root-blocks";

export interface BreadcrumbItem {
  blockId?: BlockId;
  title: string;
}

export function useBreadcrumb(app: App, repoConfig: RepoConfig) {
  const breadcrumbItems = computed((): BreadcrumbItem[] => {
    const { mainEditorRoots } = useMainEditorRoots();
    const items: BreadcrumbItem[] = [{ title: repoConfig.title }];

    if (mainEditorRoots.value.length === 1) {
      const rootBlockId = mainEditorRoots.value[0];
      const rootBlock = getBlockNode(app, rootBlockId);
      if (rootBlock) {
        const path: BlockId[] = [];
        let currentBlock: BlockNode | null = rootBlock;

        while (currentBlock) {
          path.unshift(currentBlock.id);
          currentBlock = currentBlock.parent() ?? null;
        }

        path.forEach((blockId) => {
          const block = getBlockNode(app, blockId);
          if (block) {
            const title =
              app.getTextContent(blockId) || `块 ${blockId.slice(0, 8)}`;
            items.push({ blockId, title });
          }
        });
      }
    } else if (mainEditorRoots.value.length > 1) {
      items.push({ title: "多个块" });
    }

    return items;
  });

  const handleBreadcrumbClick = (
    editor: EditableOutlineView,
    item: BreadcrumbItem
  ): void => {
    if (item.blockId) {
      editor.setRootBlockIds([item.blockId]);
    } else {
      editor.setRootBlockIds([]);
    }
  };

  const handleMainEditorEvent = (
    key: keyof EditableOutlineViewEvents,
    event: EditableOutlineViewEvents[keyof EditableOutlineViewEvents]
  ): void => {
    const { mainEditorRoots } = useMainEditorRoots();
    if (key === "root-blocks-changed") {
      const typedEvent =
        event as EditableOutlineViewEvents["root-blocks-changed"];
      mainEditorRoots.value = typedEvent.rootBlockIds;
    }
  };

  return {
    breadcrumbItems,
    handleBreadcrumbClick,
    handleMainEditorEvent,
  };
}
