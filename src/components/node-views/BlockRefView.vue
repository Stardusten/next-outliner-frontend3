<template>
  <BlockRefContextMenu :node="node">
    <NodeViewWrapper
      as="span"
      class="block-ref cursor-pointer text-[var(--color-block-ref)] rounded-sm leading-none"
      :class="[
        node.attrs.isTag &&
          'text-[length:var(--tag-font-size)] opacity-80 hover:opacity-100 transition-opacity',
        node.attrs.isTag && tagColorClasses,
        selected && 'outline-[1px] outline-offset-[1px]',
      ]"
      contenteditable="false"
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
import { nodeViewProps } from "@tiptap/vue-3";
import { computed } from "vue";
import BlockRefContextMenu from "../BlockRefContextMenu.vue";
import { NodeViewWrapper } from "./NodeViewWrapper";

const { node, editor, selected } = defineProps(nodeViewProps);
const textContentRef = computed(() => {
  const app = editor.appView.app;
  // 块引用中不显示标签
  const refVar = app.getTextContentReactive(node.attrs.blockId, false);
  return refVar.value;
});

// 读取被引用块（若为标签块）的颜色设置
const tagColor = computed(() => {
  if (!node.attrs.isTag) return "";
  const data = editor.appView.app.getReactiveBlockData(
    node.attrs.blockId
  ).value;
  if (!data || data.type !== "tag") return "";
  try {
    const json = JSON.parse(data.content);
    const snode = editor.schema.nodeFromJSON(json);
    return (snode.attrs?.color as string) || "";
  } catch {
    return "";
  }
});

const tagColorClasses = computed(() => {
  // tana 风格的胶囊：轻背景 + 可读前景 + 细边框
  const base = "px-1.5 py-[1px] rounded-md ";
  const map: Record<string, string> = {
    magenta: `${base} bg-fuchsia-600/20 text-fuchsia-300`,
    orange: `${base} bg-orange-600/20 text-orange-300`,
    amber: `${base} bg-amber-600/20 text-amber-300`,
    yellow: `${base} bg-yellow-600/20 text-yellow-300`,
    lime: `${base} bg-lime-600/20 text-lime-300`,
    green: `${base} bg-emerald-600/20 text-emerald-300`,
    teal: `${base} bg-teal-600/20 text-teal-300`,
    blue: `${base} bg-blue-600/20 text-blue-300`,
    indigo: `${base} bg-indigo-600/20 text-indigo-300`,
    violet: `${base} bg-violet-600/20 text-violet-300`,
    pink: `${base} bg-pink-600/20 text-pink-300`,
  };
  const color = tagColor.value || "blue";
  return map[color] ?? map.blue;
});

const handleClick = () => {
  editor.appView.locateBlock(node.attrs.blockId);
};
</script>
