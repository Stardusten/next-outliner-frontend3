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
import type { Observable } from "@/lib/common/observable";
import { nodeViewProps } from "@tiptap/vue-3";
import { onUnmounted, ref, watch } from "vue";
import { NodeViewWrapper } from "./NodeViewWrapper";
import { getTextContentReactive } from "@/lib/app/index/text-content";
import BlockRefContextMenu from "../BlockRefContextMenu.vue";

const { node, editor, selected } = defineProps(nodeViewProps);
let textContent: Observable<string> | null = null;
const textContentRef = ref<string>("");

watch(
  () => node.attrs.blockId,
  async (blockId) => {
    if (textContent) {
      textContent.dispose();
      textContent = null;
    }
    const app = editor.appView.app;
    textContent = getTextContentReactive(app, blockId);
    textContent.subscribe(
      (textContent) => {
        textContentRef.value = textContent;
      },
      { immediate: true }
    );
  },
  { immediate: true }
);

onUnmounted(() => {
  if (textContent) {
    textContent.dispose();
    textContent = null;
  }
});

const handleClick = () => {
  editor.appView.locateBlock(node.attrs.blockId);
};
</script>
