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
    <div
      ref="wrapper"
      class="flex-1 px-5 py-4 pb-[50vh] mt-5 outline-none"
    ></div>
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
import type { App } from "@/lib/app/app";
import { getRootBlockNodes } from "@/lib/app/block-manage";
import { getEditorFromApp } from "@/lib/app/editors";
import { withTx } from "@/lib/app/tx";
import { editorUtils, type EditorEvents } from "@/lib/editor/editor";
import { outlinerSchema } from "@/lib/editor/schema";
import { serialize } from "@/lib/editor/utils";
import type { RepoConfig } from "@/lib/repo/schema";
import { onMounted, onUnmounted, ref } from "vue";

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
  key: keyof EditorEvents,
  event: EditorEvents[keyof EditorEvents]
) => void;

onMounted(() => {
  if (!wrapper.value) throw new Error("Wrapper not found");

  const { mainEditorRoots } = useMainEditorRoots();
  const mainEditor = getEditorFromApp(app, { id: "main" });
  editorUtils.setRootBlockIds(mainEditor, mainEditorRoots.value);
  editorUtils.mount(mainEditor, wrapper.value);

  // 如果当前没有根块，创建一个默认根块
  if (getRootBlockNodes(app).length == 0) {
    withTx(app, (tx) => {
      const { type, content } = serialize(
        outlinerSchema.nodes.paragraph.create()
      );
      tx.createBlockUnder(null, 0, {
        type,
        content,
        folded: false,
      });
    });
  }

  editorEventCb = (
    key: keyof EditorEvents,
    event: EditorEvents[keyof EditorEvents]
  ) => {
    completion.handleCompletionRelatedEvent(mainEditor, key, event);
    breadcrumb.handleMainEditorEvent(key, event);
  };
  mainEditor.on("*", editorEventCb);

  (globalThis as any).mainEditor = mainEditor;
  (globalThis as any).app = app;
});

onUnmounted(() => {
  // TODO 更好的 cleanup 逻辑
  const mainEditor = getEditorFromApp(app, { id: "main" });
  mainEditor.off("*", editorEventCb);
  editorUtils.unmount(mainEditor);
  taskList.cleanup();
});
</script>
