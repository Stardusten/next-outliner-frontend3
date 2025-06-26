<template>
  <div ref="container" class="search-result-item-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { ReadonlyBlockView } from "@/lib/editor/readonly-view";
import type { BlockNode } from "@/lib/common/types";
import type { App } from "@/lib/app/app";

interface Props {
  block: BlockNode;
  storage: App;
  searchQuery: string;
}

const props = defineProps<Props>();

const container = ref<HTMLElement>();
let view: ReadonlyBlockView | null = null;

onMounted(() => {
  if (container.value) {
    view = new ReadonlyBlockView(props.storage, props.block.id);
    view.mount(container.value);
    // 初次挂载时设置高亮
    updateHighlight();
  }
});

onUnmounted(() => {
  if (view) {
    view.unmount();
    view = null;
  }
});

// 监听搜索词变化，更新高亮
watch(() => props.searchQuery, updateHighlight);

function updateHighlight() {
  if (view) {
    // 将搜索词按空格分割，支持多关键词高亮
    const terms = props.searchQuery.trim().split(/\s+/).filter(Boolean);
    view.updateHighlightTerms(terms);
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

:deep(div.list-item) {
  margin: 0;
  padding: 0 !important;
  box-shadow: unset !important;
}

:deep(div.list-item p) {
  line-height: 1.5;
}

:deep(.highlight-keep) {
  background-color: var(--highlight-keep-bg);
}
</style>
