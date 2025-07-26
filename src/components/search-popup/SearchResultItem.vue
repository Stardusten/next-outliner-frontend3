<template>
  <div class="search-result-item-container">
    <EditorContent ref="wrapper" :editor="view?.tiptap ?? undefined" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from "vue";
import type { BlockNode } from "@/lib/common/types";
import type { App } from "@/lib/app/app";
import { ReadonlyBlockView } from "@/lib/views/read-only-block/read-only-block";
import { EditorContent } from "@tiptap/vue-3";

const { block, app, searchQuery } = defineProps<{
  block: BlockNode;
  app: App;
  searchQuery: string;
}>();

const wrapper = ref<HTMLElement>();
const view = shallowRef<ReadonlyBlockView | undefined>(undefined);

onMounted(() => {
  // 拿到 EditorContent 的根元素
  const rootEl = (wrapper.value as any)?.rootEl;
  if (!(rootEl instanceof HTMLElement)) throw new Error("rootEl not found");

  view.value = new ReadonlyBlockView(app, block.id);
  view.value.mount(rootEl);
  updateHighlight();
});

onUnmounted(() => {
  if (view.value) {
    view.value.unmount();
    view.value = undefined;
  }
});

// 监听搜索词变化，更新高亮
watch(() => searchQuery, updateHighlight);

function updateHighlight() {
  if (view.value) {
    // 将搜索词按空格分割，支持多关键词高亮
    const terms = searchQuery.trim().split(/\s+/).filter(Boolean);
    view.value.updateHighlightTerms(terms);
  }
}
</script>

<style scoped>
:deep(.list-item-left) {
  display: none;
}

:deep(.ProseMirror) {
  font-size: var(--ui-font-size);
  background-color: unset !important;
}

:deep(div.list-item-x) {
  margin: 0;
  padding: 0 !important;
  box-shadow: unset !important;
}

:deep(div.list-item-x .ref-counter) {
  display: none;
}

:deep(div.list-item-x p) {
  line-height: 1.5;
}

:deep(.highlight-keep) {
  background-color: var(--highlight-keep);
}
</style>
