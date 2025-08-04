<template>
  <Popover v-if="blockNodesCutted.length > 0">
    <PopoverTrigger>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost" size="xs-icon" class="relative">
            <Clipboard :size="18" />
            <div
              class="absolute top-[2px] right-[2px] size-[5px] rounded-full bg-destructive"
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {{ $t("clipboardPopup.tooltip") }}
        </TooltipContent>
      </Tooltip>
    </PopoverTrigger>

    <PopoverContent
      side="bottom"
      align="end"
      :side-offset="8"
      :align-offset="0"
      class="w-96"
    >
      <div class="flex flex-col space-y-2">
        <div class="flex items-start">
          <div class="space-y-1 pr-2">
            <div class="font-semibold leading-none tracking-tight">
              {{ $t("clipboardPopup.title") }}
            </div>
            <div class="text-xs text-muted-foreground">
              {{
                $t("clipboardPopup.blockCount", {
                  count: blockNodesCutted.length,
                })
              }}
            </div>
          </div>
          <div class="flex items-center gap-2 ml-auto">
            <Button variant="outline" class="h-8" @click="pasteAllBlocks()">
              <ClipboardPaste :size="18" />
              {{ $t("clipboardPopup.pasteAll") }}
            </Button>
            <Button
              variant="destructiveOutline"
              class="h-8"
              @click="removeAllBlocks()"
            >
              <Trash :size="18" />
              {{ $t("clipboardPopup.clearAll") }}
            </Button>
          </div>
        </div>

        <div class="space-y-2 max-h-80 overflow-y-auto">
          <div
            v-for="blockNode in blockNodesCutted"
            :key="blockNode.id"
            class="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
          >
            <!-- 块内容区域 -->
            <div class="flex-1 min-w-0 mr-2">
              <ReadonlyBlockView
                :app="app"
                :block="blockNode"
                show-path
                class="text-sm **:text-nowrap! **:text-ellipsis! **:overflow-hidden!"
              />
            </div>

            <!-- 操作按钮区域 -->
            <div class="flex items-center gap-2 shrink-0">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="outline"
                    size="xs-icon"
                    @click="pasteBlock(blockNode.id)"
                    class="h-7 w-7"
                  >
                    <ClipboardPaste :size="14" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {{ $t("clipboardPopup.pasteHere") }}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="destructiveOutline"
                    size="xs-icon"
                    @click="removeBlock(blockNode.id)"
                    class="h-7 w-7"
                  >
                    <Trash2 :size="14" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {{ $t("clipboardPopup.deleteFromClipboard") }}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <!-- 空状态（应该不会显示） -->
        <div v-if="blockNodesCutted.length === 0" class="text-center py-8">
          <ClipboardX :size="48" class="mx-auto text-muted-foreground mb-3" />
          <div class="text-sm font-medium text-card-foreground">
            {{ $t("clipboardPopup.emptyTitle") }}
          </div>
          <div class="text-xs text-muted-foreground mt-1">
            {{ $t("clipboardPopup.emptyDescription") }}
          </div>
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Clipboard,
  ClipboardPaste,
  ClipboardX,
  Trash,
  Trash2,
  X,
} from "lucide-vue-next";
import { useBlockClipboard } from "@/composables/useBlockClipboard";
import type { App } from "@/lib/app/app";
import ReadonlyBlockView from "@/components/ReadonlyBlockView.vue";

const { app } = defineProps<{ app: App }>();

const {
  blockNodesCutted,
  removeBlock,
  removeAllBlocks,
  pasteAllBlocks,
  pasteBlock,
} = useBlockClipboard(app);
</script>
