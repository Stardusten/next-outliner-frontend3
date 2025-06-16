<template>
  <div class="more-menu-container">
    <button
      class="action-btn"
      :class="{ active: showMenu }"
      @click="toggleMenu"
      ref="moreButton"
    >
      <MoreHorizontal :size="18" />
    </button>

    <!-- 下拉菜单 -->
    <div v-if="showMenu" class="more-menu" ref="moreMenu">
      <!-- 主题设置 -->
      <div class="menu-item toggle-item">
        <span class="menu-label">主题</span>
        <ThemeToggle />
      </div>

      <!-- 行间距设置 -->
      <div class="menu-item toggle-item">
        <span class="menu-label">行间距</span>
        <SpacingToggle />
      </div>

      <div class="menu-divider"></div>

      <!-- 编辑操作 -->
      <div class="menu-item">
        <RotateCcw :size="14" class="menu-icon" />
        <span class="menu-label">撤销</span>
        <span class="menu-shortcut">Cmd + Z</span>
      </div>

      <div class="menu-item">
        <RotateCw :size="14" class="menu-icon" />
        <span class="menu-label">重做</span>
        <span class="menu-shortcut">Shift + Cmd + Z</span>
      </div>

      <div class="menu-item">
        <History :size="14" class="menu-icon" />
        <span class="menu-label">历史版本</span>
      </div>

      <div class="menu-divider"></div>

      <!-- 文件操作 -->
      <div class="menu-item">
        <Bookmark :size="14" class="menu-icon" />
        <span class="menu-label">保存为模板</span>
      </div>

      <div class="menu-item" @click="handleExport">
        <Download :size="14" class="menu-icon" />
        <span class="menu-label">导出</span>
      </div>

      <div class="menu-item" @click="handleImport">
        <Upload :size="14" class="menu-icon" />
        <span class="menu-label">导入</span>
      </div>

      <div class="menu-item">
        <Printer :size="14" class="menu-icon" />
        <span class="menu-label">打印</span>
        <span class="menu-shortcut">Cmd + P</span>
      </div>

      <div class="menu-divider"></div>

      <!-- 帮助 -->
      <div class="menu-item">
        <BookOpen :size="14" class="menu-icon" />
        <span class="menu-label">使用教程</span>
      </div>

      <div class="menu-item">
        <Command :size="14" class="menu-icon" />
        <span class="menu-label">快捷键列表</span>
        <span class="menu-shortcut">Cmd + /</span>
      </div>

      <div class="menu-item danger-item" @click="handleClearStorage">
        <Trash2 :size="14" class="menu-icon" />
        <span class="menu-label">清空块存储</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import {
  MoreHorizontal,
  ChevronRight,
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
} from "lucide-vue-next";
import ThemeToggle from "./ThemeToggle.vue";
import SpacingToggle from "./SpacingToggle.vue";

// 定义 emits
const emit = defineEmits<{
  export: [];
  import: [file: File];
  clearStorage: [];
}>();

// 菜单状态
const showMenu = ref(false);
const moreButton = ref<HTMLElement | null>(null);
const moreMenu = ref<HTMLElement | null>(null);

// 切换菜单显示
const toggleMenu = () => {
  showMenu.value = !showMenu.value;
};

// 处理导出功能
const handleExport = () => {
  emit("export");
  showMenu.value = false; // 关闭菜单
};

// 处理导入功能
const handleImport = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".jsonl,.json";
  input.onchange = (event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      emit("import", file);
    }
  };
  input.click();
  showMenu.value = false; // 关闭菜单
};

// 处理清空存储功能
const handleClearStorage = () => {
  emit("clearStorage");
  showMenu.value = false; // 关闭菜单
};

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  if (
    showMenu.value &&
    moreButton.value &&
    moreMenu.value &&
    !moreButton.value.contains(event.target as Node) &&
    !moreMenu.value.contains(event.target as Node)
  ) {
    showMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
/* 菜单容器 */
.more-menu-container {
  position: relative;
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

/* 下拉菜单 */
.more-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 270px;
  background: var(--menu-bg);
  border: 1px solid var(--menu-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px var(--menu-shadow);
  padding: 6px 0;
  z-index: 1000;
  animation: menuFadeIn 0.15s ease-out;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: var(--ui-font-size);
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 菜单项 */
.menu-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  font-size: var(--ui-font-size);
  color: var(--menu-text);
  cursor: pointer;
  transition: background-color 0.15s ease;
  min-height: 28px;
}

.menu-item:hover {
  background-color: var(--menu-item-hover);
}

/* 菜单图标 */
.menu-icon {
  margin-right: 10px;
  flex-shrink: 0;
  color: var(--menu-text-muted);
}

/* 菜单标签 */
.menu-label {
  flex: 1;
  font-weight: 400;
}

/* 快捷键 */
.menu-shortcut {
  font-size: var(--ui-font-size-tiny);
  color: var(--menu-text-muted);
  font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
}

/* 子菜单项 */
.submenu-item {
  justify-content: space-between;
}

.submenu-icon {
  color: var(--menu-text-muted);
  flex-shrink: 0;
}

/* 危险项 */
.danger-item {
  color: var(--menu-danger);
}

.danger-item:hover {
  background-color: var(--menu-danger-hover);
  color: var(--menu-danger);
}

.danger-item .menu-icon {
  color: var(--menu-danger);
}

/* 开关项 */
.toggle-item {
  justify-content: space-between;
}

/* 分隔线 */
.menu-divider {
  height: 1px;
  background: var(--menu-border);
  margin: 6px 0;
}
</style>
