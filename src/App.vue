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
              :class="{ current: index === breadcrumb.breadcrumbItems.value.length - 1 }"
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
        />
      </div>
    </header>

    <div class="editor-panel">
      <div ref="wrapper" class="editor-wrapper"></div>
    </div>

    <!-- 补全弹窗 -->
    <CompletionPopup
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
      :conflictCount="importExport.importConflictCount.value"
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
      <p style="margin: 0 0 16px 0; color: var(--menu-text)">
        此操作将永久删除所有块数据，无法恢复。
      </p>
      <p style="margin: 0; color: var(--menu-danger); font-weight: 500">
        请谨慎操作，建议在清空前先导出数据备份。
      </p>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import "prosemirror-view/style/prosemirror.css";
import type { BlockStorage } from "./lib/storage/interface";
import type { Editor, EditorEvent } from "./lib/editor/interface";
import { ProseMirrorEditor } from "./lib/editor/impl";
import { initializeBlockStorage } from "./utils/data";
import { LocalStorageBlockStorage } from "./lib/storage/local-storage-impl";
import { FullTextIndex } from "./lib/index/fulltext";
import { Search, Menu } from "lucide-vue-next";
import MoreMenu from "./components/MoreMenu.vue";
import {
  useTheme,
  useLineSpacing,
  useBreadcrumb,
  useBlockRefCompletion,
  useSearch,
  useImportExport,
} from "./composables";
import CompletionPopup from "./components/CompletionPopup.vue";
import SearchPopup from "./components/SearchPopup.vue";
import ImportDialog from "./components/ImportDialog.vue";
import BaseModal from "./components/BaseModal.vue";

// 基础状态
const wrapper = ref<HTMLElement | null>(null);
const blockStorage: BlockStorage = new LocalStorageBlockStorage();
let editor: Editor;
let fulltextIndex: FullTextIndex;

useTheme();
useLineSpacing();

const completion = useBlockRefCompletion(
  () => editor,
  () => blockStorage,
  () => fulltextIndex,
);

const breadcrumb = useBreadcrumb(
  () => editor,
  () => blockStorage,
);

const search = useSearch(
  () => editor,
  () => blockStorage,
  () => fulltextIndex,
);

const importExport = useImportExport(() => blockStorage);

onMounted(() => {
  if (!wrapper.value) {
    throw new Error("Wrapper not found");
  }

  // 初始化存储数据
  initializeBlockStorage(blockStorage);

  // 创建编辑器实例
  editor = new ProseMirrorEditor(blockStorage, {
    initialRootBlockIds: breadcrumb.rootBlockIds.value,
  });
  editor.mount(wrapper.value);

  // 添加编辑器事件监听器
  editor.addEventListener(completion.handleCompletionRelatedEvent);
  editor.addEventListener(breadcrumb.handleEditorEvent);

  // 创建索引
  fulltextIndex = new FullTextIndex(blockStorage);
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
  font-size: 14px;
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
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
  --editor-codeblock-font-size: 14px;

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
  --toggle-bg: #eaeef2;
  --toggle-bg-active: #0969da;
  --toggle-thumb: #ffffff;
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
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
  --editor-codeblock-font-size: 14px;
  --editor-codeblock-line-height: 1;

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
  --toggle-bg: #30363d;
  --toggle-bg-active: #58a6ff;
  --toggle-thumb: #ffffff;
}

/* 行间距设置在 editor.css 中定义 */

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
