import { ref } from "vue";
import type { Component } from "vue";

// 菜单项类型
export interface ContextMenuItem {
  icon?: Component;
  label: string;
  action: () => void;
  danger?: boolean; // 是否为危险操作
  disabled?: boolean; // 是否禁用
}

// 分割线类型
export interface ContextMenuDivider {
  type: "divider";
}

// 菜单项或分割线
export type ContextMenuItemOrDivider = ContextMenuItem | ContextMenuDivider;

// 上下文数据接口
export interface ContextMenuData {
  items: ContextMenuItemOrDivider[];
}

const visible = ref(false);
const position = ref<{ x: number; y: number } | null>(null);
const context = ref<ContextMenuData | null>(null);

export const useContextMenu = () => {
  // 显示上下文菜单
  const show = (x: number, y: number, contextData: ContextMenuData) => {
    position.value = { x, y };
    context.value = contextData;
    visible.value = true;
  };

  // 隐藏上下文菜单
  const hide = () => {
    visible.value = false;
    position.value = null;
    context.value = null;
  };

  // 处理右键菜单事件
  const handleContextMenu = (
    event: MouseEvent,
    contextData: ContextMenuData
  ) => {
    event.preventDefault();
    event.stopPropagation();

    // 隐藏其他可能打开的菜单
    hide();

    // 下一帧显示新菜单，确保先隐藏了旧菜单
    requestAnimationFrame(() => {
      show(event.clientX, event.clientY, contextData);
    });
  };

  return {
    // 状态
    visible,
    position,
    context,

    // 方法
    show,
    hide,
    handleContextMenu,
  };
};
