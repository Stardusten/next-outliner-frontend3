<template>
  <NodeViewWrapper
    as="span"
    class="block-ref cursor-pointer text-[var(--color-block-ref)]"
    :class="{
      // 标签样式
      'text-[length:var(--tag-font-size)] opacity-60 hover:opacity-100 transition-opacity':
        node.attrs.isTag,
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
</template>

<script setup lang="ts">
import type { Observable } from "@/lib/common/observable";
import { nodeViewProps } from "@tiptap/vue-3";
import { onUnmounted, ref, watch } from "vue";
import { NodeViewWrapper } from "./NodeViewWrapper";
import { getTextContentReactive } from "@/lib/app/index/text-content";

const { node, editor } = defineProps(nodeViewProps);
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
