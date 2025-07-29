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
import { nodeViewProps } from "@tiptap/vue-3";
import { NodeViewWrapper } from "./NodeViewWrapper";
import { onMounted, onUnmounted, ref } from "vue";
import type { Observable } from "@/lib/common/observable";

const { node, editor } = defineProps(nodeViewProps);
let textContent: Observable<string> | null = null;
const textContentRef = ref<string | undefined>(undefined);

onMounted(async () => {
  // 这里使用异步导入，防止循环依赖
  const { getTextContentReactive } = await import(
    "@/lib/app/index/text-content"
  );
  const app = editor.appView.app;
  textContent = getTextContentReactive(app, node.attrs.blockId);
  textContent.subscribe(
    (textContent) => {
      textContentRef.value = textContent;
    },
    { immediate: true }
  );
});

onUnmounted(() => {
  textContent && textContent.dispose();
});

const handleClick = () => {
  editor.appView.locateBlock(node.attrs.blockId);
};
</script>
