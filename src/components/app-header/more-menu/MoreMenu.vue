<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <slot />
    </DropdownMenuTrigger>

    <DropdownMenuContent class="w-[270px]" align="end" :side-offset="8">
      <!-- 主题设置 -->
      <div
        class="relative flex items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-hidden select-none"
      >
        <div class="flex items-center gap-2">
          <Paintbrush :size="16" class="text-muted-foreground shrink-0" />
          <span>主题</span>
        </div>
        <ThemeToggle />
      </div>

      <!-- 行间距设置 -->
      <div
        class="relative flex items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-hidden select-none"
      >
        <div class="flex items-center gap-2">
          <Menu :size="16" class="text-muted-foreground shrink-0" />
          <span>行间距</span>
        </div>
        <SpacingToggle />
      </div>

      <DropdownMenuSeparator />

      <!-- 编辑操作 -->
      <DropdownMenuItem>
        <RotateCcw :size="14" />
        <span>撤销</span>
        <DropdownMenuShortcut>Cmd + Z</DropdownMenuShortcut>
      </DropdownMenuItem>

      <DropdownMenuItem>
        <RotateCw :size="14" />
        <span>重做</span>
        <DropdownMenuShortcut>Shift + Cmd + Z</DropdownMenuShortcut>
      </DropdownMenuItem>

      <DropdownMenuItem>
        <History :size="14" />
        <span>历史版本</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <!-- 文件操作 -->
      <DropdownMenuItem>
        <Bookmark :size="14" />
        <span>保存为模板</span>
      </DropdownMenuItem>

      <DropdownMenuItem @click="handleExport()">
        <Download :size="14" />
        <span>导出</span>
      </DropdownMenuItem>

      <DropdownMenuItem @click="openImportDialog">
        <Upload :size="14" />
        <span>导入</span>
      </DropdownMenuItem>

      <DropdownMenuItem>
        <Printer :size="14" />
        <span>打印</span>
        <DropdownMenuShortcut>Cmd + P</DropdownMenuShortcut>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <!-- 帮助 -->
      <DropdownMenuItem>
        <BookOpen :size="14" />
        <span>使用教程</span>
      </DropdownMenuItem>

      <DropdownMenuItem>
        <Command :size="14" />
        <span>快捷键列表</span>
        <DropdownMenuShortcut>Cmd + /</DropdownMenuShortcut>
      </DropdownMenuItem>

      <DropdownMenuItem @click="showSettings">
        <Settings :size="14" />
        <span>设置</span>
        <DropdownMenuShortcut>Cmd + ,</DropdownMenuShortcut>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem variant="destructive" @click="handleClearHistory()">
        <Trash2 :size="14" />
        <span>清空历史版本</span>
      </DropdownMenuItem>

      <DropdownMenuItem variant="destructive" @click="handleClearStorage()">
        <Trash2 :size="14" />
        <span>清空块存储</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import {
  MoreHorizontal,
  RotateCcw,
  RotateCw,
  History,
  Bookmark,
  Download,
  Upload,
  Printer,
  BookOpen,
  Command,
  Trash2,
  BrushCleaning,
  Settings,
  Paintbrush,
  Menu,
} from "lucide-vue-next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/app-header/more-menu/ThemeToggle.vue";
import SpacingToggle from "@/components/app-header/more-menu/SpacingToggle.vue";
import { EXPORT_FORMATS, useImportExport } from "@/composables/useImportExport";
import { ref } from "vue";
import type { useSettings } from "@/composables";

const props = defineProps<{
  importExport: ReturnType<typeof useImportExport>;
  settings: ReturnType<typeof useSettings>;
}>();

const { handleExport, handleImport, handleClearHistory, handleClearStorage } =
  props.importExport;

// 显示设置面板
const showSettings = () => {
  props.settings.visible.value = true;
};

// 处理导入功能
const openImportDialog = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = EXPORT_FORMATS;
  input.onchange = (event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      handleImport(file);
    }
  };
  input.click();
};
</script>
