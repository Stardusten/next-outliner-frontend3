<template>
  <header class="header-bar">
    <!-- 左侧菜单按钮和面包屑 -->
    <div class="header-left">
      <Button variant="ghost" size="xs-icon">
        <Menu :size="18" />
      </Button>

      <!-- 面包屑 -->
      <Breadcrumb
        :breadcrumb-items="breadcrumb.breadcrumbItems.value"
        @item-click="breadcrumb.handleBreadcrumbClick(editor, $event)"
      />
    </div>

    <!-- 右侧按钮 -->
    <div class="header-actions">
      <!-- 快速插入 -->
      <QuickAdd :app="app">
        <Button variant="ghost" size="xs-icon">
          <CirclePlus :size="18" />
        </Button>
      </QuickAdd>

      <ClipboardPopup :app="app" />

      <!-- 附件 -->
      <AttachmentPopup :attachment="attachment" :task-list="taskList" />

      <!-- 搜索 -->
      <SearchPopup :search="search" :app="app">
        <Button
          Button
          variant="ghost"
          size="xs-icon"
          @click="search.resetSearch"
        >
          <Search :size="18" />
        </Button>
      </SearchPopup>

      <MoreMenu :import-export="importExport" :settings="settings">
        <Button variant="ghost" size="xs-icon">
          <MoreHorizontal :size="18" />
        </Button>
      </MoreMenu>
    </div>
  </header>
</template>

<script setup lang="ts">
import type {
  useAttachment,
  useAttachmentTaskList,
  useBreadcrumb,
  useImportExport,
  useSearch,
  useSettings,
} from "@/composables";
import type { App } from "@/lib/app/app";
import { getLastFocusedAppView } from "@/lib/app/views";
import { CirclePlus, Menu, MoreHorizontal, Search } from "lucide-vue-next";
import { computed } from "vue";
import QuickAdd from "../QuickAdd.vue";
import SearchPopup from "../search-popup/SearchPopup.vue";
import { Button } from "../ui/button";
import AttachmentPopup from "./attachment-popup/AttachmentPopup.vue";
import Breadcrumb from "./breadcrumb/Breadcrumb.vue";
import ClipboardPopup from "./clipboard/ClipboardPopup.vue";
import MoreMenu from "./more-menu/MoreMenu.vue";

const props = defineProps<{
  app: App;
  breadcrumb: ReturnType<typeof useBreadcrumb>;
  search: ReturnType<typeof useSearch>;
  attachment: ReturnType<typeof useAttachment>;
  taskList: ReturnType<typeof useAttachmentTaskList>;
  importExport: ReturnType<typeof useImportExport>;
  settings: ReturnType<typeof useSettings>;
}>();

// TODO
const editor = computed(() => getLastFocusedAppView(props.app!));
</script>

<style scoped>
.header-bar {
  height: 46px;
  padding: 15px 16px 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-background);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
