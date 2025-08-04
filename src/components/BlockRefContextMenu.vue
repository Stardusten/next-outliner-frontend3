<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>
    <ContextMenuContent class="w-[200px]">
      <ContextMenuItem>
        <AtSign />
        {{ $t("blockRefContextMenu.editAlias") }}
      </ContextMenuItem>
      <ContextMenuItem @click="handleCopyBlockRefId">
        <Link />
        {{ $t("blockRefContextMenu.copyBlockRefId") }}
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>

<script setup lang="ts">
import { AtSign, Link } from "lucide-vue-next";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  ContextMenuItem,
} from "./ui/context-menu";
import type { Node } from "@tiptap/pm/model";
import { toast } from "vue-sonner";
import { useI18n } from "vue-i18n";

const { node } = defineProps<{ node: Node }>();
const { t } = useI18n();

const handleCopyBlockRefId = () => {
  try {
    navigator.clipboard.writeText(node.attrs.blockId);
    toast.success(t("blockRefContextMenu.copyBlockRefIdSuccess"));
  } catch (e) {
    console.error(e);
  }
};
</script>
