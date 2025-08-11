<template>
  <div :class="cn('search-result-item-container', props.class)">
    <EditorContent ref="wrapper" :editor="view?.tiptap ?? undefined" />
    <span
      v-if="showPath"
      class="text-xs block text-muted-foreground text-nowrap text-ellipsis overflow-hidden"
    >
      {{ path }}
    </span>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onUnmounted,
  watch,
  shallowRef,
  type HTMLAttributes,
  computed,
} from "vue";
import type { BlockNode } from "@/lib/common/types";
import type { App } from "@/lib/app/app";
import { ReadonlyBlockView } from "@/lib/app-views/read-only-block/read-only-block";
import { EditorContent } from "@tiptap/vue-3";
import { cn } from "@/lib/common/tailwindcss";

const props = defineProps<{
  block: BlockNode;
  app: App;
  searchQuery?: string;
  class?: HTMLAttributes["class"];
  showPath?: boolean;
}>();

const wrapper = ref<HTMLElement>();
const view = shallowRef<ReadonlyBlockView | undefined>(undefined);

const path = computed(() => {
  if (!props.showPath) return "";
  const res: string[] = [];
  let curr = props.block.parent();
  while (curr) {
    const text = props.app.getTextContent(curr.id, true);
    if (text) res.push(text);
    curr = curr.parent();
  }
  return res.reverse().join(" / ");
});

onMounted(() => {
  // 拿到 EditorContent 的根元素
  const rootEl = (wrapper.value as any)?.rootEl;
  if (!(rootEl instanceof HTMLElement)) throw new Error("rootEl not found");

  view.value = new ReadonlyBlockView(props.app, props.block.id);
  view.value.mount(rootEl);
  updateHighlight(props.searchQuery);
});

onUnmounted(() => {
  if (view.value) {
    view.value.unmount();
    view.value = undefined;
  }
});

// 监听搜索词变化，更新高亮
watch(() => props.searchQuery, updateHighlight);

function updateHighlight(searchQuery?: string) {
  if (view.value) {
    if (searchQuery === undefined) {
      view.value.updateHighlightTerms([]);
      return;
    } else {
      // 将搜索词按空格分割，支持多关键词高亮
      const terms = searchQuery.trim().split(/\s+/).filter(Boolean);
      // console.log(searchQuery, terms);
      view.value.updateHighlightTerms(terms);
    }
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
