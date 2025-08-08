import type { Component } from "vue";
import { ref } from "vue";

/*
 * 更健壮且易用的上下文菜单实现。
 * =====================================================
 * 设计目标：
 * 1. 只暴露必要的可写状态；内部状态只读化，减少误操作。
 * 2. 改进类型定义，使得各类菜单项属性互斥、无歧义。
 * 3. 提供统一的 open / close API，支持以鼠标事件或坐标形式打开。
 */

// ----------------------- 类型定义 -----------------------

// 基础属性（除 divider 外都会有）
interface BaseMenuEntry {
  label?: string;
  icon?: Component;
  danger?: boolean;
  disabled?: boolean;
}

// 可执行项
export interface ActionMenuItem extends BaseMenuEntry {
  type: "item";
  action: () => void;
}

// 分隔线
export interface DividerMenuItem {
  type: "divider";
}

// 子菜单
export interface SubMenuItem extends BaseMenuEntry {
  type: "submenu";
  children: MenuItem[];
}

export type MenuItem = ActionMenuItem | DividerMenuItem | SubMenuItem;

// ----------------------- 状态 -----------------------

const isOpen = ref(false);
const position = ref<{ x: number; y: number } | null>(null);
const items = ref<MenuItem[]>([]);

// ----------------------- API -----------------------

// 传入鼠标事件或坐标打开菜单
function open(
  evOrPos: MouseEvent | { x: number; y: number },
  _items: MenuItem[]
) {
  let coords: { x: number; y: number };

  if ("clientX" in evOrPos) {
    coords = { x: evOrPos.clientX, y: evOrPos.clientY };
    // 防止浏览器默认右键菜单
    (evOrPos as MouseEvent).preventDefault?.();
  } else {
    coords = evOrPos;
  }

  position.value = coords;
  items.value = _items;
  isOpen.value = true;
}

function close() {
  isOpen.value = false;
  position.value = null;
  items.value = [];
}

export const useContextMenu = () => {
  return {
    // 状态
    isOpen,
    position,
    items,

    // 操作
    open,
    close,
  };
};
