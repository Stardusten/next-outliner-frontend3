<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>
    <ContextMenuContent class="w-[200px]">
      <ContextMenuItem>
        <Link />
        {{ $t("blockContextMenu.copyBlockRef") }}
      </ContextMenuItem>
      <ContextMenuItem variant="destructive" @click="handleDelete">
        <Trash />
        {{ $t("blockContextMenu.delete") }}
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>

<script setup lang="ts">
import { Link, Trash } from "lucide-vue-next";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";
import type { BlockId } from "@/lib/common/types";
import type { Editor } from "@tiptap/core";
import { recursiveDeleteBlock } from "@/lib/views/tiptap-editor/commands";

const props = defineProps<{
  blockId: BlockId;
  editor: Editor;
}>();
const { blockId, editor } = props;

const handleDelete = () => {
  if (!editor) return;
  const cmd = recursiveDeleteBlock(editor, blockId);
  editor.appView.execCommand(cmd);
};
</script>
