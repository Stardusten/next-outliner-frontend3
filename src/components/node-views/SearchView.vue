<template>
  <NodeViewWrapper as="div" class="flex flex-wrap">
    <NodeViewContent as="div" class="flex-0-0-auto pr-[4px]" />

    <div class="flex gap-1 items-center">
      <span
        v-if="node.attrs.status != null"
        :class="{
          'text-destructive': node.attrs.status === 'invalid',
          'text-muted-foreground': typeof node.attrs.status === 'number',
        }"
      >
        {{
          node.attrs.status === "invalid"
            ? $t("searchBlock.invalidQuery")
            : $t("searchBlock.nResults", { n: node.attrs.status })
        }}
      </span>

      <!-- 编辑搜索查询 -->
      <EditSearchQueryPopup
        :editor="editor"
        :node="node"
        :getBlockId="getBlockId"
      >
        <Button
          variant="secondary"
          size="2xs-icon"
          class="opacity-50 hover:opacity-100 transition-opacity"
        >
          <Pencil class="size-[12px]" />
        </Button>
      </EditSearchQueryPopup>

      <SearchViewOptionsPopup
        :editor="editor"
        :searchNode="node"
        :getBlockId="getBlockId"
      >
        <Button
          variant="secondary"
          size="2xs-icon"
          class="opacity-50 hover:opacity-100 transition-opacity"
        >
          <Settings class="size-[12px]" />
        </Button>
      </SearchViewOptionsPopup>

      <!-- 刷新搜索结果 -->
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="secondary"
            size="2xs-icon"
            class="opacity-50 hover:opacity-100 transition-opacity"
          >
            <RefreshCcw class="size-[12px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {{ $t("listItem.refreshSearch") }}
        </TooltipContent>
      </Tooltip>
    </div>

    <!-- 让文本透明，让光标在这个元素里面的时候不显示 -->
    <div
      class="flex-1 cursor-text text-transparent"
      contenteditable="false"
      @click.prevent="handleClickPad"
    ></div>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { NodeViewContent, nodeViewProps } from "@tiptap/vue-3";
import { NodeViewWrapper } from "./NodeViewWrapper";
import EditSearchQueryPopup from "../EditSearchQueryPopup.vue";
import { Button } from "../ui/button";
import { Pencil, RefreshCcw, Settings } from "lucide-vue-next";
import { TextSelection } from "@tiptap/pm/state";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import SearchViewOptionsPopup from "../SearchViewOptionsPopup.vue";
import type { BlockId } from "@/lib/common/types";

const { node, getPos, editor } = defineProps(nodeViewProps);

const getBlockId = () => {
  const pos = getPos();
  if (pos === undefined) return null;
  const $pos = editor.view.state.doc.resolve(pos);
  return $pos.parent.attrs.blockId as BlockId | null;
};

const handleClickPad = () => {
  const pos = getPos();
  if (pos === undefined) return;
  const tr = editor.view.state.tr;
  const $pos = editor.view.state.doc.resolve(pos + node.nodeSize);
  const end = TextSelection.findFrom($pos, -1);
  if (!end) return;
  tr.setSelection(end);
  editor.view.dispatch(tr);
};
</script>
