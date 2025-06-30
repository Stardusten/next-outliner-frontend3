<template>
  <div class="flex flex-col h-screen">
    <TooltipProvider>
      <!-- Header Bar -->
      <AppHeader
        ref="appHeaderRef"
        :app="app"
        :breadcrumb="breadcrumb"
        :search="search"
        :attachment="attachment"
        :task-list="taskList"
        :import-export="importExport"
        :settings="settings"
      />

      <div class="flex-1 flex flex-col overflow-auto">
        <div
          ref="wrapper"
          class="flex-1 px-5 py-4 pb-[50vh] mt-5 outline-none"
        ></div>
      </div>

      <Toaster />

      <!-- 补全弹窗 -->
      <CompletionPopup
        :app="app"
        :visible="completion.completionVisible.value"
        :query="completion.completionQuery.value"
        :position="completion.completionPosition.value"
        :blocks="completion.availableBlocks.value"
        :activeIndex="completion.completionActiveIndex.value"
        @select="completion.handleBlockSelect"
        @close="completion.handleCompletionClose"
      />

      <!-- 搜索弹窗 -->
      <SearchPopup :search="search" :app="app" />

      <!-- 导入对话框 -->
      <ImportDialog :import-export="importExport" />

      <!-- 清空存储确认对话框 -->
      <ClearStorageConfirmDialog :import-export="importExport" />

      <!-- 清空历史版本确认对话框 -->
      <ClearHistoryConfirmDialog :import-export="importExport" />

      <!-- 上传确认对话框 -->
      <UploadConfirmDialog :attachment="attachment" />

      <!-- Toast 通知 -->
      <Toast :toasts="toast.toasts.value" @remove="toast.remove" />

      <!-- 全局右键菜单 -->
      <ContextMenu />

      <!-- 设置面板 -->
      <SettingsPanel />
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import "prosemirror-view/style/prosemirror.css";
import { onMounted, onUnmounted, ref } from "vue";
import AppHeader from "./components/app-header/AppHeader.vue";
import ClearHistoryConfirmDialog from "./components/ClearHistoryConfirmDialog.vue";
import ClearStorageConfirmDialog from "./components/ClearStorageConfirmDialog.vue";
import CompletionPopup from "./components/CompletionPopup.vue";
import ContextMenu from "./components/ContextMenu.vue";
import ImportDialog from "./components/ImportDialog.vue";
import SearchPopup from "./components/search-popup/SearchPopup.vue";
import SettingsPanel from "./components/settings-panel/SettingsPanel.vue";
import Toast from "./components/Toast.vue";
import UploadConfirmDialog from "./components/UploadConfirmDialog.vue";
import {
  useAttachment,
  useAttachmentTaskList,
  useBlockRefCompletion,
  useBreadcrumb,
  useImportExport,
  useSearch,
  useSettings,
  useToast,
} from "./composables";

import { TooltipProvider } from "./components/ui/tooltip";
import { devRepoConfig } from "./dev-config";
import { R2AttachmentStorage } from "./lib/app/attachment/r2-browser";
import { LocalStoragePersistence } from "./lib/app/local-storage";
import { ProseMirrorEditor } from "./lib/editor/impl";
import type { Editor } from "./lib/editor/interface";
import type { ProviderRegistry, RepoConfig } from "./lib/repo/repo";
import { Repo } from "./lib/repo/repo";
import { Toaster } from "./components/ui/sonner";

const wrapper = ref<HTMLElement | null>(null);
const appHeaderRef = ref<InstanceType<typeof AppHeader> | null>(null);

const repoConfig: RepoConfig = devRepoConfig;

const providers: ProviderRegistry = {
  persistence: {
    "local-storage": (cfg: RepoConfig) => new LocalStoragePersistence(cfg.id),
  },
  attachmentStorage: {
    r2: (cfg: RepoConfig) => new R2AttachmentStorage(cfg.attachment.params),
  },
};

const repo = new Repo(repoConfig, providers);
const app = repo.instantiateApp();
console.info("create blocks success");

let editor: Editor;

const getApp = () => app;
const getEditor = () => editor;

// 初始化 composables
const completion = useBlockRefCompletion(getEditor, getApp);
const breadcrumb = useBreadcrumb(getEditor, getApp);
const search = useSearch(getEditor, getApp);
const settings = useSettings();
const importExport = useImportExport(getApp);
const toast = useToast();
const attachment = useAttachment(getApp);
const taskList = useAttachmentTaskList(getApp);

onMounted(() => {
  if (!wrapper.value) {
    throw new Error("Wrapper not found");
  }

  // 创建编辑器实例
  editor = new ProseMirrorEditor(app, {
    initialRootBlockIds: breadcrumb.rootBlockIds.value,
  });
  editor.mount(wrapper.value);

  // 添加编辑器事件监听器
  editor.addEventListener(completion.handleCompletionRelatedEvent);
  editor.addEventListener(breadcrumb.handleEditorEvent);

  (globalThis as any).editor = editor;
  (globalThis as any).storage = app;
});

onUnmounted(() => {
  if (editor) {
    // 移除事件监听器
    editor.removeEventListener(completion.handleCompletionRelatedEvent);
    editor.removeEventListener(breadcrumb.handleEditorEvent);
    editor.destroy();
  }
});
</script>

<style>
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKai-Regular.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKai-Light.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKai-Bold.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKaiMono-Regular.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKaiMono-Light.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKaiMono-Bold.css");

@import "./assets/base.css";
@import "./lib/editor/style/editor.css";

/* 行间距设置在 editor.css 中定义 */

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
  background-color: transparent;
}

::-webkit-scrollbar-thumb {
  border-radius: 6px;
  background-color: oklch(0.5 0 0 / 0.3);
  transition: background-color 0.2s ease;
}

::-webkit-scrollbar-thumb:hover {
  background-color: oklch(0.5 0 0 / 0.5);
}

::-webkit-scrollbar-corner {
  background-color: var(--background);
}
</style>
