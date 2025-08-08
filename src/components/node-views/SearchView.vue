<template>
  <NodeViewWrapper as="div" class="flex flex-wrap">
    <NodeViewContent as="div" class="flex-0-0-auto pr-[4px]" />

    <div class="flex gap-1 items-center">
      <!-- 编辑搜索查询 -->
      <EditSearchQueryPopup
        :init-query="node.attrs.query ?? ''"
        :on-submit="handleQueryUpdate"
      >
        <Button variant="secondary" size="2xs-icon">
          <Pencil class="size-[12px]" />
        </Button>
      </EditSearchQueryPopup>

      <!-- 刷新搜索结果 -->
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="secondary" size="2xs-icon">
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
import { Pencil, RefreshCcw } from "lucide-vue-next";
import { TextSelection } from "@tiptap/pm/state";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const { node, getPos, editor } = defineProps(nodeViewProps);

const handleQueryUpdate = (query: string) => {};

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
