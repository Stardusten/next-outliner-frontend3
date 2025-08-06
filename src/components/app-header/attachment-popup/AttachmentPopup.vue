<template>
  <Popover>
    <PopoverTrigger>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost" size="xs-icon">
            <Folder :size="18" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {{ $t("attachmentMgr.tooltip") }}
        </TooltipContent>
      </Tooltip>
    </PopoverTrigger>

    <!-- 弹窗内容 -->
    <PopoverContent
      side="bottom"
      align="end"
      :side-offset="8"
      :align-offset="0"
      class="w-96"
    >
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
import { Button } from "@/components/ui/button";
import type { useAttachment, useAttachmentTaskList } from "@/composables";
import { Folder } from "lucide-vue-next";
import AttachmentPopupContent from "./AttachmentPopupContent.vue";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

defineProps<{
  attachment: ReturnType<typeof useAttachment>;
  taskList: ReturnType<typeof useAttachmentTaskList>;
}>();
</script>
