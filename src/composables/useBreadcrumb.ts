import type { App } from "@/lib/app/app";
import type { BlockId, BlockNode } from "@/lib/common/types";
import type { Editor, EditorEvents } from "@/lib/editor/editor";
import { setRootBlockIds } from "@/lib/editor/editor";
import { computed } from "vue";
import { useLocalStorage } from "./useLocalStorage";
import type { RepoConfig } from "@/lib/repo/schema";
import { getBlockNode } from "@/lib/app/block-manage";
import { getTextContent } from "@/lib/app/index/text-content";
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
              getTextContent(app, blockId) || `块 ${blockId.slice(0, 8)}`;
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
    editor: Editor,
    item: BreadcrumbItem
  ): void => {
    if (item.blockId) {
      setRootBlockIds(editor, [item.blockId]);
    } else {
      setRootBlockIds(editor, []);
    }
  };

  const handleMainEditorEvent = (
    key: keyof EditorEvents,
    event: EditorEvents[keyof EditorEvents]
  ): void => {
    const { mainEditorRoots } = useMainEditorRoots();
    if (key === "root-blocks-changed") {
      const typedEvent = event as EditorEvents["root-blocks-changed"];
      mainEditorRoots.value = typedEvent.rootBlockIds;
    }
  };

  return {
    breadcrumbItems,
    handleBreadcrumbClick,
    handleMainEditorEvent,
  };
}
