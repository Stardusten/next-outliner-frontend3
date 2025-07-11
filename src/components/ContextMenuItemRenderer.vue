<template>
  <!-- Divider -->
  <DropdownMenuSeparator v-if="item.type === 'divider'" />

  <!-- Sub-menu -->
  <template v-else-if="item.type === 'submenu'">
    <DropdownMenuSub>
      <DropdownMenuSubTrigger :disabled="item.disabled" class="flex gap-2">
        <component v-if="item.icon" :is="item.icon" :size="14" />
        <span>{{ item.label }}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent class="min-w-[150px]">
        <ContextMenuItemRenderer
          v-for="(child, idx) in (item as any).children"
          :key="idx"
          :item="child"
        />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  </template>

  <!-- Leaf item -->
  <DropdownMenuItem
    v-else
    :disabled="item.disabled"
    :variant="item.danger ? 'destructive' : 'default'"
    @click="handleClick(item)"
  >
    <component v-if="item.icon" :is="item.icon" :size="14" />
    <span>{{ item.label }}</span>
  </DropdownMenuItem>
</template>

<script setup lang="ts">
import type { MenuItemDef, MenuItem } from "@/composables/useContextMenu";
import { useContextMenu } from "@/composables";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./ui/dropdown-menu";

// Give the component a name so it can reference itself recursively
// eslint-disable-next-line vue/define-macros-order
defineOptions({ name: "ContextMenuItemRenderer" });

const props = defineProps<{ item: MenuItemDef }>();

const { hide } = useContextMenu();

function handleClick(menuItem: MenuItem) {
  if (menuItem.disabled) return;
  menuItem.action?.();
  hide();
}
</script>
