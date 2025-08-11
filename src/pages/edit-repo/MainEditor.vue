<template>
  <AppHeader
    :app="app!"
    :breadcrumb="breadcrumb!"
    :search="search!"
    :attachment="attachment!"
    :task-list="taskList!"
    :import-export="importExport!"
    :settings="settings!"
  />

  <!-- 编辑器容器 -->
  <div class="flex-1 flex flex-col overflow-auto">
    <EditorContent
      class="flex-1 px-5 py-4 pb-[50vh] mt-5 outline-none"
      ref="wrapper"
      :editor="mainEditorView?.tiptap ?? undefined"
    />
  </div>

  <CompletionPopup
    :app="app!"
    :visible="completion!.completionVisible.value"
    :query="completion!.completionQuery.value"
    :position="completion!.completionPosition.value"
    :blocks="completion!.availableBlocks.value"
    :activeIndex="completion!.completionActiveIndex.value"
    @select="completion!.handleBlockSelect"
    @close="completion!.handleCompletionClose"
  />
  <ImportDialog :import-export="importExport!" />
  <ClearStorageConfirmDialog :import-export="importExport!" />
  <ClearHistoryConfirmDialog :import-export="importExport!" />
  <UploadConfirmDialog :attachment="attachment!" />
  <ContextMenu />
  <SettingsPanel />
</template>

<script setup lang="ts">
import AppHeader from "@/components/app-header/AppHeader.vue";
import ClearHistoryConfirmDialog from "@/components/ClearHistoryConfirmDialog.vue";
import ClearStorageConfirmDialog from "@/components/ClearStorageConfirmDialog.vue";
import CompletionPopup from "@/components/CompletionPopup.vue";
import ContextMenu from "@/components/ContextMenu.vue";
import ImportDialog from "@/components/ImportDialog.vue";
import SettingsPanel from "@/components/settings-panel/SettingsPanel.vue";
import UploadConfirmDialog from "@/components/UploadConfirmDialog.vue";
import { useSettings } from "@/composables";
import { useAttachment } from "@/composables/useAttachment";
import { useAttachmentTaskList } from "@/composables/useAttachmentTaskList";
import { useBlockRefCompletion } from "@/composables/useBlockRefCompletion";
import { useBreadcrumb } from "@/composables/useBreadcrumb";
import { useImportExport } from "@/composables/useImportExport";
import { useMainEditorRoots } from "@/composables/useMainEditorRoots";
import { useSearch } from "@/composables/useSearch";
import {
  EditableOutlineView,
  type EditableOutlineViewEvents,
} from "@/lib/app-views/editable-outline/editable-outline";
import "@/lib/app-views/editable-outline/style.css";
import type { App } from "@/lib/app/app";
import { registerAppView, unregisterAppView } from "@/lib/app/views";
import type { RepoConfig } from "@/lib/repo/schema";
import { BlockRefCompletion } from "@/lib/tiptap/functionalities/block-ref-completion";
import { CompositionFix } from "@/lib/tiptap/functionalities/composition-fix";
import { FocusedBlockIdTracker } from "@/lib/tiptap/functionalities/focused-block-id-tracker";
import { HighlightCodeblock } from "@/lib/tiptap/functionalities/highlight-codeblock";
import { NormalKeymap } from "@/lib/tiptap/functionalities/keymap/normal";
import { PasteHtmlOrPlainText } from "@/lib/tiptap/functionalities/paste-html";
import { ToCodeblock } from "@/lib/tiptap/functionalities/to-codeblock";
import { markExtensions } from "@/lib/tiptap/marks";
import { nodeExtensions } from "@/lib/tiptap/nodes";
import { EditorContent } from "@tiptap/vue-3";
import { onMounted, onUnmounted, ref, shallowRef } from "vue";
import { Gapcursor } from "@tiptap/extensions";

const props = defineProps<{
  app: App;
  repoConfig: RepoConfig;
}>();

const wrapper = ref<HTMLElement | null>(null);
const { app, repoConfig } = props;

const settings = useSettings();
const completion = useBlockRefCompletion(app);
const breadcrumb = useBreadcrumb(app, repoConfig);
const search = useSearch(app);
const importExport = useImportExport(app);
const attachment = useAttachment(app);
const taskList = useAttachmentTaskList(app);

let editorEventCb: (
  key: keyof EditableOutlineViewEvents,
  event: EditableOutlineViewEvents[keyof EditableOutlineViewEvents]
) => void;

const mainEditorView = shallowRef<EditableOutlineView | undefined>(undefined);

onMounted(() => {
  // 拿到 EditorContent 的根元素
  const rootEl = (wrapper.value as any)?.rootEl;
  if (!(rootEl instanceof HTMLElement)) throw new Error("rootEl not found");

  const { mainEditorRoots } = useMainEditorRoots();
  mainEditorView.value = new EditableOutlineView(app, {
    id: "main",
    extensions: [
      ...nodeExtensions,
      ...markExtensions,
      NormalKeymap,
      BlockRefCompletion,
      CompositionFix,
      HighlightCodeblock,
      ToCodeblock,
      PasteHtmlOrPlainText,
      FocusedBlockIdTracker,
      Gapcursor,
    ],
  });
  registerAppView(app, mainEditorView.value);
  mainEditorView.value.setRootBlockIds(mainEditorRoots.value);
  mainEditorView.value.mount(rootEl);

  // 聚焦到开头
  setTimeout(() => {
    const tiptap = mainEditorView.value?.tiptap;
    tiptap?.commands.setTextSelection(0);
    tiptap?.view.focus();
  });

  // TODO
  // 如果当前没有根块，创建一个默认根块
  // if (getRootBlockNodes(app).length == 0) {
  //   withTx(app, (tx) => {
  //     const { type, content } = serialize(
  //       schema.nodes.paragraph.create()
  //     );
  //     tx.createBlockUnder(null, 0, {
  //       type,
  //       content,
  //       folded: false,
  //     });
  //   });
  // }

  editorEventCb = (
    key: keyof EditableOutlineViewEvents,
    event: EditableOutlineViewEvents[keyof EditableOutlineViewEvents]
  ) => {
    completion.handleCompletionRelatedEvent(mainEditorView.value, key, event);
    breadcrumb.handleMainEditorEvent(key, event);
  };
  mainEditorView.value?.on("*", editorEventCb);

  (globalThis as any).mainEditor = mainEditorView;
  (globalThis as any).app = app;
});

onUnmounted(() => {
  // TODO 更好的 cleanup 逻辑
  if (mainEditorView.value) {
    mainEditorView.value.off("*", editorEventCb);
    mainEditorView.value.unmount();
    unregisterAppView(app, mainEditorView.value.id);
  }
  taskList.cleanup();
});
</script>
