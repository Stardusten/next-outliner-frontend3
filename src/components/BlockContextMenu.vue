<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>
    <ContextMenuContent class="w-[200px]">
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Copy />
          {{ $t("blockContextMenu.copyAs") }}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem @click="handleCopyAsMarkdown">
            <Markdown />
            {{ $t("blockContextMenu.copyAsMarkdown") }}
          </ContextMenuItem>
          <ContextMenuItem>
            <Text />
            {{ $t("blockContextMenu.copyAsPureText") }}
          </ContextMenuItem>
          <ContextMenuItem>
            <Html />
            {{ $t("blockContextMenu.copyAsHtml") }}
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Clipboard />
          {{ $t("blockContextMenu.pasteAs") }}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent> </ContextMenuSubContent>
        <ContextMenuSubContent>
          <ContextMenuItem>
            <Markdown />
            {{ $t("blockContextMenu.pasteAsMarkdownSingleBlock") }}
          </ContextMenuItem>
          <ContextMenuItem>
            <Markdown />
            {{ $t("blockContextMenu.pasteAsMarkdownAutoSplit") }}
          </ContextMenuItem>
          <ContextMenuItem>
            <Text />
            {{ $t("blockContextMenu.pasteAsPureTextSingleBlock") }}
          </ContextMenuItem>
          <ContextMenuItem>
            <Text />
            {{ $t("blockContextMenu.pasteAsPureTextAutoSplit") }}
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuItem @click="handleCopyBlockRef">
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
import { Clipboard, Copy, Link, Text, Trash } from "lucide-vue-next";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./ui/context-menu";
import type { BlockId } from "@/lib/common/types";
import type { Editor } from "@tiptap/core";
import { recursiveDeleteBlock } from "@/lib/views/tiptap-editor/commands";
import Markdown from "./icons/Markdown.vue";
import Html from "./icons/Html.vue";
import { toMarkdown } from "@/lib/views/utils";

const props = defineProps<{
  blockId: BlockId;
  editor: Editor;
}>();
const { blockId, editor } = props;

const handleCopyBlockRef = () => {
  if (!editor) return;
  try {
    navigator.clipboard.writeText(blockId);
  } catch (err) {
    console.error(err);
  }
};

const handleDelete = () => {
  if (!editor) return;
  const cmd = recursiveDeleteBlock(editor, blockId);
  editor.appView.execCommand(cmd, true);
};

const handleCopyAsMarkdown = () => {
  const markdown = toMarkdown(editor.appView.app, [blockId]);
  try {
    navigator.clipboard.writeText(markdown);
  } catch (err) {
    console.error(err);
  }
};
</script>
