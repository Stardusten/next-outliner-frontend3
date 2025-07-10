<template>
  <DropdownMenu v-model:open="visible">
    <DropdownMenuTrigger class="hidden"></DropdownMenuTrigger>
    <DropdownMenuContent
      class="block-contextmenu-content w-[250px] overflow-y-auto max-h-[var(--reka-dropdown-menu-content-available-height)]"
    >
      <template v-for="(item, index) in items" :key="index">
        <DropdownMenuSeparator
          v-if="item.type === 'divider'"
        ></DropdownMenuSeparator>
        <DropdownMenuItem
          v-else
          :disabled="item.disabled"
          :variant="item.danger ? 'destructive' : 'default'"
          @click="handleClickMenuItem(item)"
        >
          <component v-if="item.icon" :is="item.icon" :size="14" />
          <span>{{ item.label }}</span>
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
// 这些图标现在通过菜单项动态传入，不需要在组件中导入
import { useContextMenu } from "@/composables";
import type { MenuItem } from "@/composables/useContextMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { nextTick, watch } from "vue";

const { visible, position, items, hide: hideContextMenu } = useContextMenu();

watch(position, async () => {
  await nextTick();
  if (!position.value) return;
  const { x, y } = position.value!;

  // 默认向右下弹出
  // 这里把弹出位置作为 CSS 变量绑定到 body 上
  // 因为 reka 把样式写死了
  // 只能这样去覆盖
  document.body.style.setProperty("--popover-x", `${x}px`);
  document.body.style.setProperty("--popover-y", `${y}px`);
});

const handleClickMenuItem = (menuItem: MenuItem) => {
  if (menuItem.disabled) {
    return;
  }
  menuItem.action?.();
  hideContextMenu();
};
</script>

<style>
[data-reka-popper-content-wrapper]:has(> .block-contextmenu-content) {
  transform: translate(var(--popover-x), var(--popover-y)) !important;
}
</style>
