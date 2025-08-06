<template>
  <BlockRefContextMenu :node="node">
    <NodeViewWrapper
      as="span"
      class="block-ref cursor-pointer text-[var(--color-block-ref)] rounded-sm"
      :class="{
        // 标签样式
        'text-[length:var(--tag-font-size)] opacity-60 hover:opacity-100 transition-opacity':
          node.attrs.isTag,
        'outline-[1px] outline-offset-[1px]': selected,
      }"
      @click.prevent="handleClick"
      :data-block-id="node.attrs.blockId"
      :data-is-tag="node.attrs.isTag"
    >
      {{
        textContentRef
          ? node.attrs.isTag
            ? `#${textContentRef}`
            : textContentRef
          : ""
      }}
    </NodeViewWrapper>
  </BlockRefContextMenu>
</template>

<script setup lang="ts">
import { getTextContentReactive } from "@/lib/app/index/text-content";
import { nodeViewProps } from "@tiptap/vue-3";
import { computed } from "vue";
import BlockRefContextMenu from "../BlockRefContextMenu.vue";
import { NodeViewWrapper } from "./NodeViewWrapper";

const { node, editor, selected } = defineProps(nodeViewProps);
const textContentRef = computed(() => {
  const refVar = getTextContentReactive(editor.appView.app, node.attrs.blockId);
  return refVar.value;
});

const handleClick = () => {
  editor.appView.locateBlock(node.attrs.blockId);
};
</script>
