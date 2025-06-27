<template>
  <div class="app-container">
    <!-- Header Bar -->
    <header class="header-bar">
      <!-- 左侧菜单按钮和面包屑 -->
      <div class="header-left">
        <button class="action-btn menu-btn">
          <Menu :size="18" />
        </button>

        <!-- 面包屑 -->
        <div class="breadcrumb">
          <template
            v-for="(item, index) in breadcrumb.breadcrumbItems.value"
            :key="item.blockId || 'root'"
          >
            <span
              class="breadcrumb-item"
              :class="{
                current: index === breadcrumb.breadcrumbItems.value.length - 1,
              }"
              @click="breadcrumb.handleBreadcrumbClick(item)"
            >
              {{ item.title }}
            </span>
            <span
              v-if="index < breadcrumb.breadcrumbItems.value.length - 1"
              class="breadcrumb-separator"
              >/</span
            >
          </template>
        </div>
      </div>

      <!-- 右侧按钮 -->
      <div class="header-actions">
        <button class="action-btn" @click="search.showSearch">
          <Search :size="18" />
        </button>
        <MoreMenu
          @export="importExport.handleExport"
          @import="importExport.handleImport"
          @clearStorage="importExport.handleClearStorage"
          @clearHistory="importExport.handleClearHistory"
        />
      </div>
    </header>

    <div class="editor-panel">
      <div ref="wrapper" class="editor-wrapper"></div>
    </div>

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
    <SearchPopup
      :app="app"
      :visible="search.searchVisible.value"
      :position="search.searchPosition.value"
      :searchResults="search.searchResults.value"
      :activeIndex="search.activeIndex.value"
      :searchQuery="search.searchQuery.value"
      @select="search.handleSearchSelect"
      @close="search.hideSearch"
      @update:searchQuery="search.updateSearchQuery"
      @search="search.performSearch"
    />

    <!-- 导入对话框 -->
    <ImportDialog
      :visible="importExport.importDialogVisible.value"
      :blockCount="importExport.importBlockCount.value"
      @confirm="importExport.handleImportConfirm"
      @cancel="importExport.handleImportCancel"
    />

    <!-- 清空存储确认对话框 -->
    <BaseModal
      :visible="importExport.clearStorageDialogVisible.value"
      title="确认清空存储"
      confirm-text="确认清空"
      :is-danger="true"
      @confirm="importExport.handleClearStorageConfirm"
      @cancel="importExport.handleClearStorageCancel"
      @close="importExport.handleClearStorageCancel"
    >
      <p
        style="
          margin: 0 0 16px 0;
          color: var(--menu-text);
          font-size: var(--ui-font-size);
        "
      >
        此操作将永久删除所有块数据，无法恢复。
      </p>
      <p
        style="
          margin: 0;
          color: var(--menu-danger);
          font-weight: 500;
          font-size: var(--ui-font-size);
        "
      >
        请谨慎操作，建议在清空前先导出数据备份。
      </p>
    </BaseModal>

    <!-- 新增：清空历史版本确认对话框 -->
    <BaseModal
      :visible="importExport.clearHistoryDialogVisible.value"
      title="确认清空历史版本"
      confirm-text="确认清空"
      :is-danger="true"
      @confirm="importExport.handleClearHistoryConfirm"
      @cancel="importExport.handleClearHistoryCancel"
      @close="importExport.handleClearHistoryCancel"
    >
      <p
        style="
          margin: 0 0 16px 0;
          color: var(--menu-text);
          font-size: var(--ui-font-size);
        "
      >
        此操作将删除所有历史增量记录，仅保留当前最新快照，无法恢复。
      </p>
      <p
        style="
          margin: 0;
          color: var(--menu-danger);
          font-weight: 500;
          font-size: var(--ui-font-size);
        "
      >
        请谨慎操作，清空前建议先导出快照备份。
      </p>
    </BaseModal>

    <!-- Toast 通知 -->
    <Toast :toasts="toast.toasts.value" @remove="toast.remove" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import "prosemirror-view/style/prosemirror.css";
import type { Editor, EditorEvent } from "./lib/editor/interface";
import { ProseMirrorEditor } from "./lib/editor/impl";
import { FullTextIndex } from "./lib/app/index/fulltext";
import { Search, Menu } from "lucide-vue-next";
import MoreMenu from "./components/MoreMenu.vue";
import {
  useTheme,
  useLineSpacing,
  useBreadcrumb,
  useBlockRefCompletion,
  useSearch,
  useImportExport,
  useToast,
} from "./composables";
import CompletionPopup from "./components/CompletionPopup.vue";
import SearchPopup from "./components/SearchPopup.vue";
import ImportDialog from "./components/ImportDialog.vue";
import BaseModal from "./components/BaseModal.vue";
import Toast from "./components/Toast.vue";
import { App } from "./lib/app/app";
import { LocalStoragePersistence } from "./lib/app/local-storage";

const docId = "doc01";
const wrapper = ref<HTMLElement | null>(null);
const app = new App(docId, LocalStoragePersistence);
console.info("create blocks success");

let editor: Editor;
let fulltextIndex: FullTextIndex;

useTheme();
useLineSpacing();

const completion = useBlockRefCompletion(
  () => editor,
  () => app
);

const breadcrumb = useBreadcrumb(
  () => editor,
  () => app
);

const search = useSearch(
  () => editor,
  () => app
);

const importExport = useImportExport(() => app);

const toast = useToast();

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

  // 创建索引
  fulltextIndex = new FullTextIndex(app);

  (globalThis as any).editor = editor;
  (globalThis as any).storage = app;
  (globalThis as any).fulltextIndex = fulltextIndex;
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

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header-bar {
  height: 46px;
  padding: 15px 16px 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--color-bg);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  font-size: var(--ui-font-size);
  color: var(--color-text);
}

.breadcrumb-item {
  color: var(--color-text-muted);
  transition: color 0.2s;
  cursor: pointer;
}

.breadcrumb-item:hover {
  color: var(--color-text);
}

.breadcrumb-item.current {
  color: var(--color-text);
  font-weight: 500;
  cursor: default;
}

.breadcrumb-separator {
  margin: 0 8px;
  color: var(--border-color);
  font-size: var(--ui-font-size);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--color-text);
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background-color: var(--color-bg-hover);
}

.action-btn.active {
  background-color: var(--color-bg-hover);
  color: var(--color-block-ref);
}

.menu-btn {
  margin-right: 4px;
}

.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.editor-wrapper {
  flex: 1;
  padding: 16px 20px;
  padding-bottom: 50vh;
  margin-top: 20px;
  outline: none;
}
</style>

<style>
@import "./assets/base.css";
@import "./lib/editor/style/editor.css";
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKai-Regular.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKai-Light.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKai-Bold.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKaiMono-Regular.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKaiMono-Light.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKaiMono-Bold.css");

/* 默认亮色主题 */
:root,
.theme-light {
  --color-text: #1a1a1a;
  --color-text-muted: #666666;
  --color-bg: #ffffff;
  --color-bg-muted: #f8f9fa;
  --color-bg-hover: #f5f5f5;
  --color-block-ref: #0969da;
  --color-link: #0969da;
  --editor-font-family: LXGWWenKai, sans-serif;
  --border-color: #e1e4e8;
  --border-color-muted: #f1f3f4;
  --scrollbar-thumb: #c1c8cd;
  --scrollbar-thumb-hover: #a8b2ba;
  --color-guide-line: #e1e4e8;
  --bullet-bg-collapsed: #ddd;
  --editor-codeblock-font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;

  /* 字体大小变量 */
  --editor-font-size: 16px;
  --ui-font-size: 14px;
  --ui-font-size-small: 12px;
  --ui-font-size-tiny: 11px;
  --editor-codeblock-font-size: 14px;
  --highlight-keep-bg: #ffe066;
  --ref-counter-font-size: 14px;

  /* 语法高亮颜色 */
  --color-syntax-comment: #6a737d;
  --color-syntax-keyword: #d73a49;
  --color-syntax-string: #032f62;
  --color-syntax-number: #005cc5;
  --color-syntax-tag: #22863a;
  --color-syntax-meta: #e36209;

  /* 菜单相关颜色 */
  --menu-bg: #ffffff;
  --menu-border: #e1e4e8;
  --menu-shadow: rgba(0, 0, 0, 0.1);
  --menu-item-hover: #f5f7fa;
  --menu-text: #1a1a1a;
  --menu-text-muted: #656d76;
  --menu-danger: #d1242f;
  --menu-danger-hover: #ffeaea;
  --menu-danger-hover-filled: #b91c1c;
  --toggle-bg: #eaeef2;
  --toggle-bg-active: #0969da;
  --toggle-thumb: #ffffff;

  /* Toast 相关颜色 */
  --toast-bg: rgba(255, 255, 255, 0.95);
  --toast-border: #e1e4e8;
  --toast-border-radius: 8px;
  --toast-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  --toast-shadow-hover: 0 12px 40px rgba(0, 0, 0, 0.18);
  --toast-padding: 16px;
  --toast-title-font-size: 14px;
  --toast-message-font-size: 13px;
  --toast-title-color: #1a1a1a;
  --toast-message-color: #586069;
  --toast-close-color: #8b949e;
  --toast-close-hover-bg: #f5f7fa;
  --toast-close-hover-color: #1a1a1a;
  --toast-success-border: #28a745;
  --toast-success-icon: #28a745;
  --toast-error-border: #d73a49;
  --toast-error-icon: #d73a49;
  --toast-warning-border: #ffc107;
  --toast-warning-icon: #e36209;
  --toast-info-border: #0969da;
  --toast-info-icon: #0969da;
}

/* 暗色主题 */
.theme-dark {
  --color-text: #ddd;
  --color-text-muted: #8b949e;
  --color-bg: #000;
  --color-bg-muted: #161b22;
  --color-bg-hover: #21262d;
  --color-block-ref: #58a6ff;
  --color-link: #58a6ff;
  --border-color: #30363d;
  --border-color-muted: #21262d;
  --scrollbar-thumb: #484f58;
  --scrollbar-thumb-hover: #656c76;
  --color-guide-line: #333;
  --bullet-bg-collapsed: #333;
  --editor-codeblock-font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;

  /* 字体大小变量 */
  --editor-font-size: 16px;
  --ui-font-size: 14px;
  --ui-font-size-small: 12px;
  --ui-font-size-tiny: 11px;
  --editor-codeblock-font-size: 14px;
  --editor-codeblock-line-height: 1;
  --highlight-keep-bg: rgb(0, 102, 153);
  --ref-counter-font-size: 14px;

  /* 语法高亮颜色 - 暗色主题 */
  --color-syntax-comment: #8b949e;
  --color-syntax-keyword: #ff7b72;
  --color-syntax-string: #a5d6ff;
  --color-syntax-number: #79c0ff;
  --color-syntax-tag: #7ee787;
  --color-syntax-meta: #ffa657;

  /* 菜单暗色主题 */
  --menu-bg: #161b22;
  --menu-border: #30363d;
  --menu-shadow: rgba(0, 0, 0, 0.3);
  --menu-item-hover: #21262d;
  --menu-text: #e6edf3;
  --menu-text-muted: #8b949e;
  --menu-danger: #f85149;
  --menu-danger-hover: #2d1117;
  --menu-danger-hover-filled: #dc2626;
  --toggle-bg: #30363d;
  --toggle-bg-active: #58a6ff;
  --toggle-thumb: #ffffff;

  /* Toast 暗色主题 */
  --toast-bg: rgba(22, 27, 34, 0.95);
  --toast-border: #30363d;
  --toast-border-radius: 8px;
  --toast-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  --toast-shadow-hover: 0 12px 40px rgba(0, 0, 0, 0.6);
  --toast-padding: 16px;
  --toast-title-font-size: 14px;
  --toast-message-font-size: 13px;
  --toast-title-color: #e6edf3;
  --toast-message-color: #8b949e;
  --toast-close-color: #8b949e;
  --toast-close-hover-bg: #21262d;
  --toast-close-hover-color: #e6edf3;
  --toast-success-border: #7ee787;
  --toast-success-icon: #7ee787;
  --toast-error-border: #f85149;
  --toast-error-icon: #f85149;
  --toast-warning-border: #ffa657;
  --toast-warning-icon: #ffa657;
  --toast-info-border: #58a6ff;
  --toast-info-icon: #58a6ff;
}

/* 行间距设置在 editor.css 中定义 */

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: var(--ui-font-size);
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
  background-color: transparent;
}

::-webkit-scrollbar-thumb {
  border-radius: 6px;
  background-color: var(--scrollbar-thumb);
  transition: background-color 0.2s ease;
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover);
}

::-webkit-scrollbar-corner {
  background-color: var(--color-bg);
}
</style>
