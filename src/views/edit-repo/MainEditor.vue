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
  <SearchPopup :search="search!" :app="app!" />
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
import SearchPopup from "@/components/search-popup/SearchPopup.vue";
import SettingsPanel from "@/components/settings-panel/SettingsPanel.vue";
import UploadConfirmDialog from "@/components/UploadConfirmDialog.vue";
import { useSettings } from "@/composables";
import type { useRepoConfigs } from "@/composables/useRepoConfigs";
import type { App } from "@/lib/app/app";
import {
  mount,
  setRootBlockIds,
  unmount,
  type Editor,
  type EditorEvents,
} from "@/lib/editor/editor";
import { useToast } from "@/composables/useToast";
import { useBlockRefCompletion } from "@/composables/useBlockRefCompletion";
import { useBreadcrumb } from "@/composables/useBreadcrumb";
import { useSearch } from "@/composables/useSearch";
import { useImportExport } from "@/composables/useImportExport";
import { useAttachment } from "@/composables/useAttachment";
import { useAttachmentTaskList } from "@/composables/useAttachmentTaskList";
import { onMounted, onUnmounted, ref, watch } from "vue";
import type { RepoConfig } from "@/lib/repo/schema";
import { getEditorFromApp } from "@/lib/app/editors";
import { useMainEditorRoots } from "@/composables/useMainEditorRoots";

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
  const mainEditor = getEditorFromApp(app, "main");
  setRootBlockIds(mainEditor, mainEditorRoots.value);
  mount(mainEditor, wrapper.value);

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
  const mainEditor = getEditorFromApp(app, "main");
  mainEditor.off("*", editorEventCb);
  unmount(mainEditor);
  taskList.cleanup();
});
</script>
