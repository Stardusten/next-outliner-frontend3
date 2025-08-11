<template>
  <Popover v-model:open="open">
    <PopoverTrigger>
      <Tooltip>
        <TooltipTrigger as-child>
          <slot />
        </TooltipTrigger>
        <TooltipContent>
          {{ $t("listItem.editViewOptions") }}
        </TooltipContent>
      </Tooltip>
    </PopoverTrigger>

    <!-- 弹窗内容 -->
    <PopoverContent
      side="bottom"
      align="start"
      :side-offset="8"
      :align-offset="0"
      class="w-80 p-3"
    >
      <div class="space-y-4">
        <!-- 显示块路径选项 -->
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <Label class="text-sm">{{
              $t("searchViewOptions.showBlockPath")
            }}</Label>
            <p class="text-xs text-muted-foreground">
              {{ $t("searchViewOptions.showBlockPathDesc") }}
            </p>
          </div>
          <Switch
            :model-value="showPath"
            @update:model-value="handleToggleBlockPath"
          />
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ref, watch, computed } from "vue";
import type { App } from "@/lib/app/app";
import type { BlockId } from "@/lib/common/types";
import { type Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { SearchAttrs } from "@/lib/tiptap/nodes/search";
import { updateSarchBlockAttrs } from "@/lib/app-views/editable-outline/commands";
import type { Editor as TiptapEditor } from "@tiptap/core";

const props = defineProps<{
  editor: TiptapEditor;
  searchNode: ProseMirrorNode;
  getBlockId: () => BlockId | null;
}>();

const open = ref(false);
const showPath = ref(false);

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      const attrs = props.searchNode.attrs as SearchAttrs;
      showPath.value = attrs.showPath;
    }
  },
  { immediate: true }
);

const handleToggleBlockPath = (showPath_: boolean) => {
  const { editor, searchNode: node, getBlockId } = props;
  const blockId = getBlockId();
  if (!blockId) return;
  const cmd = updateSarchBlockAttrs(editor, blockId, {
    showPath: showPath_,
  });
  editor.appView.execCommand(cmd, true);
  showPath.value = showPath_;
};
</script>
