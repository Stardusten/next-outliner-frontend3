<template>
  <DropdownMenu v-model:open="visible">
    <DropdownMenuTrigger class="hidden"></DropdownMenuTrigger>
    <DropdownMenuContent
      class="block-contextmenu-content w-[250px] overflow-y-auto max-h-[var(--reka-dropdown-menu-content-available-height)]"
    >
      <ContextMenuItemRenderer
        v-for="(item, index) in items"
        :key="index"
        :item="item"
      />
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { useContextMenu } from "@/composables";
import ContextMenuItemRenderer from "./ContextMenuItemRenderer.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { nextTick, watch } from "vue";

const { visible, position, items } = useContextMenu();

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
</script>

<style>
[data-reka-popper-content-wrapper]:has(> .block-contextmenu-content) {
  transform: translate(var(--popover-x), var(--popover-y)) !important;
}
</style>
