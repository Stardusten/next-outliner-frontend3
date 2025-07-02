<template>
  <div>
    <!-- 任务列表 -->
    <div class="max-h-80 overflow-y-auto">
      <div class="flex items-center justify-between px-4 py-2 border-b">
        <span class="text-sm text-muted-foreground font-medium"
          >{{ tasks.length }} 个任务</span
        >
        <Button
          v-if="tasks.length > 0"
          variant="ghost"
          size="sm"
          class="h-6 px-2 text-xs"
          @click="clearCompletedTasks"
        >
          清空
        </Button>
      </div>

      <div v-if="tasks.length > 0">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="flex items-center justify-between p-3 hover:bg-muted/50 border-b last:border-b-0 min-h-12"
          :class="`task-${task.status}`"
        >
          <!-- 左侧：图标和信息 -->
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <div class="text-muted-foreground">
              <Upload v-if="task.type === 'upload'" :size="16" />
              <Download v-else-if="task.type === 'download'" :size="16" />
              <Trash2 v-else :size="16" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate max-w-36">
                {{ task.filename }}
              </div>
              <div
                class="flex items-center gap-1 text-xs text-muted-foreground"
              >
                <span>{{ getTaskTypeText(task.type) }}</span>
                <span>•</span>
                <span>{{ formatFileSize(task.size) }}</span>
                <span>•</span>
                <span>{{ getTaskStatusText(task.status) }}</span>
              </div>
            </div>
          </div>

          <!-- 右侧：进度和状态 -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <!-- 进度条 -->
            <div
              v-if="task.status === 'progress'"
              class="flex items-center gap-1.5 min-w-[70px]"
            >
              <div class="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary rounded-full transition-all duration-300"
                  :style="{
                    width: `${task.progress ?? 0}%`,
                  }"
                ></div>
              </div>
              <span class="text-xs text-muted-foreground font-mono min-w-7"
                >{{ task.progress }}%</span
              >
            </div>

            <!-- 任务状态图标 -->
            <div class="w-4 flex justify-center">
              <Loader2
                v-if="task.status === 'progress'"
                class="animate-spin text-primary"
                :size="16"
              />
              <CheckCircle2
                v-else-if="task.status === 'success'"
                class="text-green-500"
                :size="16"
              />
              <XCircle
                v-else-if="task.status === 'error'"
                class="text-destructive"
                :size="16"
              />
              <Clock v-else class="text-muted-foreground" :size="16" />
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="py-8 px-4 text-center">
        <FileX :size="32" class="text-muted-foreground mx-auto mb-2" />
        <div class="text-sm font-medium mb-1">暂无任务</div>
        <div class="text-xs text-muted-foreground">
          上传或下载文件后，任务将显示在这里
        </div>
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <div class="flex gap-2 p-3 border-t">
      <Button variant="outline" size="sm" class="flex-1" @click="handleUpload">
        <Upload :size="16" />
        上传文件
      </Button>
      <Button variant="outline" size="sm" class="flex-1" @click="handleBrowse">
        <FolderOpen :size="16" />
        浏览文件
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Folder,
  FolderOpen,
  Upload,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  FileX,
} from "lucide-vue-next";

import { Button } from "@/components/ui/button";
import {
  useAttachment,
  useAttachmentTaskList,
  type AttachmentTask,
} from "@/composables";

// Props
const props = defineProps<{
  attachment: ReturnType<typeof useAttachment>;
  taskList: ReturnType<typeof useAttachmentTaskList>;
}>();

const { handleUpload, handleBrowse } = props.attachment;
const {
  tasks,
  clearCompletedTasks,
  getTaskTypeText,
  formatFileSize,
  getTaskStatusText,
} = props.taskList;
</script>

<style scoped>
/* 保留状态相关的样式类供 JavaScript 使用 */
.task-success,
.task-error,
.task-progress,
.task-pending {
  /* 这些类由 JavaScript 动态添加，但样式已通过 Tailwind 直接应用 */
}
</style>
