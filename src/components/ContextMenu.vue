<template>
  <Teleport to="body">
    <div
      v-if="contextMenu.visible.value"
      ref="menuRef"
      class="context-menu"
      :style="menuStyle"
      @click="handleMenuClick"
    >
      <div class="menu-content">
        <!-- 动态渲染菜单项 -->
        <template
          v-for="(item, index) in contextMenu.context.value?.items || []"
          :key="index"
        >
          <!-- 分割线 -->
          <div
            v-if="'type' in item && item.type === 'divider'"
            class="menu-divider"
          ></div>

          <!-- 菜单项 -->
          <div
            v-else
            class="menu-item"
            :class="{
              'danger-item': 'danger' in item && item.danger,
              'disabled-item': 'disabled' in item && item.disabled,
            }"
            @click="handleAction(item as ContextMenuItem)"
          >
            <component
              v-if="'icon' in item && item.icon"
              :is="item.icon"
              :size="14"
              class="menu-icon"
            />
            <span class="menu-label">{{
              ("label" in item && item.label) || ""
            }}</span>
          </div>
        </template>

        <!-- 空状态 -->
        <div
          v-if="!contextMenu.context.value?.items?.length"
          class="menu-empty"
        >
          暂无可用操作
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
// 这些图标现在通过菜单项动态传入，不需要在组件中导入
import { useContextMenu, type ContextMenuItem } from "@/composables";

const contextMenu = useContextMenu();
const menuRef = ref<HTMLElement | null>(null);

// 计算菜单样式
const menuStyle = computed(() => {
  if (!contextMenu.visible.value || !contextMenu.position.value) {
    return {};
  }

  const { x, y } = contextMenu.position.value;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 估算菜单尺寸
  const menuWidth = 220;
  const menuHeight = 200;

  let finalX = x;
  let finalY = y;

  // 防止菜单超出右边界
  if (x + menuWidth > viewportWidth) {
    finalX = viewportWidth - menuWidth - 8;
  }

  // 防止菜单超出底部边界
  if (y + menuHeight > viewportHeight) {
    finalY = viewportHeight - menuHeight - 8;
  }

  // 防止菜单超出左边界和顶部边界
  finalX = Math.max(8, finalX);
  finalY = Math.max(8, finalY);

  return {
    left: `${finalX}px`,
    top: `${finalY}px`,
  };
});

// 处理菜单点击
const handleMenuClick = (event: Event) => {
  // 阻止事件冒泡，防止立即关闭菜单
  event.stopPropagation();
};

// 处理操作
const handleAction = (menuItem: ContextMenuItem) => {
  // 如果菜单项被禁用，不执行操作
  if (menuItem.disabled) {
    return;
  }

  // 执行菜单项的操作
  menuItem.action();

  // 关闭菜单
  contextMenu.hide();
};

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  if (contextMenu.visible.value && menuRef.value) {
    const target = event.target as Node;
    if (!menuRef.value.contains(target)) {
      contextMenu.hide();
    }
  }
};

// 按 ESC 关闭菜单
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && contextMenu.visible.value) {
    contextMenu.hide();
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeyDown);
});
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 2000;
  background: var(--menu-bg);
  border: 1px solid var(--menu-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--menu-shadow);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: var(--ui-font-size);
  min-width: 200px;
  animation: contextMenuFadeIn 0.15s ease;
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 菜单内容 */
.menu-content {
  padding: 6px 0;
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

/* 分割线 */
.menu-divider {
  height: 1px;
  background-color: var(--menu-border);
  margin: 4px 0;
}

/* 危险项 */
.danger-item {
  color: var(--menu-danger);
}

.danger-item:hover {
  background-color: var(--menu-danger-hover);
}

.danger-item .menu-icon {
  color: var(--menu-danger);
}

/* 禁用项 */
.disabled-item {
  opacity: 0.5;
  cursor: not-allowed;
}

.disabled-item:hover {
  background-color: transparent;
}

/* 空状态 */
.menu-empty {
  padding: 16px 12px;
  text-align: center;
  color: var(--menu-text-muted);
  font-size: var(--ui-font-size-small);
  font-style: italic;
}
</style>
