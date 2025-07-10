import type { Component } from "vue";
import { ref } from "vue";

// 菜单项类型
export interface MenuItem {
  type: "item";
  label: string;
  icon?: Component;
  action: () => void;
  danger?: boolean; // 是否为危险操作
  disabled?: boolean; // 是否禁用
}

// 分割线类型
export interface MenuDivider {
  type: "divider";
}

// 菜单项或分割线
export type MenuItemDef = MenuItem | MenuDivider;

const visible = ref(false);
const position = ref<{ x: number; y: number } | null>(null);
const items = ref<MenuItemDef[]>([]);

export const useContextMenu = () => {
  // 显示上下文菜单
  const show = (x: number, y: number, _items: MenuItemDef[]) => {
    position.value = { x, y };
    items.value = _items;
    visible.value = true;
  };

  // 隐藏上下文菜单
  const hide = () => {
    visible.value = false;
    position.value = null;
    items.value = [];
  };

  return {
    // 状态
    visible,
    position,
    items,

    // 方法
    show,
    hide,
  };
};
