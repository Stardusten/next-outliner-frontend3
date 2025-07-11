<template>
  <Popover>
    <PopoverTrigger>
      <Tooltip>
        <TooltipTrigger as-child>
          <slot />
        </TooltipTrigger>
        <TooltipContent>
          {{ $t("attachmentMgr.tooltip") }}
        </TooltipContent>
      </Tooltip>
    </PopoverTrigger>


    <!-- 弹窗内容 -->
    <PopoverContent side="bottom" align="end" :side-offset="8" :align-offset="0" class="w-80 p-0">
      <!-- 头部 -->
      <div class="flex items-center gap-2 px-4 py-3 border-b">
        <Folder :size="16" class="text-muted-foreground" />
        <h3 class="font-medium">附件管理</h3>
      </div>

      <!-- 内容 -->
      <AttachmentPopupContent :attachment="attachment" :task-list="taskList" />
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { useAttachment, useAttachmentTaskList } from "@/composables";
import { Folder } from "lucide-vue-next";
import AttachmentPopupContent from "./AttachmentPopupContent.vue";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

defineProps<{
  attachment: ReturnType<typeof useAttachment>;
  taskList: ReturnType<typeof useAttachmentTaskList>;
}>();
</script>
