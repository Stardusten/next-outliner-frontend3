<template>
  <div class="flex flex-col space-y-2">
    <div class="flex items-start">
      <div class="space-y-1 pr-2">
        <div class="font-semibold leading-none tracking-tight">
          {{ $t("attachmentMgr.title") }}
        </div>
        <div class="text-xs text-muted-foreground">
          {{ $t("attachmentMgr.nTasks", { n: tasks.length }) }}
        </div>
      </div>
      <div class="flex items-center gap-2 ml-auto">
        <Button
          variant="destructiveOutline"
          class="h-8"
          @click="clearCompletedTasks"
          :disabled="!canClearCompletedTasks"
        >
          <Trash2 :size="16" />
          {{ $t("attachmentMgr.clearCompletedTasks") }}
        </Button>
      </div>
    </div>

    <div class="space-y-2 max-h-80 overflow-y-auto">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
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
            <div class="flex items-center gap-1 text-xs text-muted-foreground">
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

    <!-- 空状态（应该不会显示） -->
    <div v-if="tasks.length == 0" class="text-center py-8">
      <FileX :size="32" class="text-muted-foreground mx-auto mb-2" />
      <div class="text-sm font-medium mb-1">
        {{ $t("attachmentMgr.noTask") }}
      </div>
      <div class="text-xs text-muted-foreground">
        {{ $t("attachmentMgr.noTaskDescription") }}
      </div>
    </div>

    <div class="flex items-center gap-2">
      <Button variant="outline" class="h-8 flex-1" @click="handleUpload">
        <Upload :size="16" />
        {{ $t("attachmentMgr.upload") }}
      </Button>
      <Button variant="outline" class="h-8 flex-1" @click="handleBrowse">
        <FolderOpen :size="16" />
        {{ $t("attachmentMgr.browse") }}
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

const { getFileFromPopWindow, upload } = props.attachment;

// 处理上传
const handleUpload = async () => {
  const file = await getFileFromPopWindow();
  if (file) {
    await upload(file, true); // 需要确认
  }
};

// 处理浏览（选择文件但不上传）
const handleBrowse = async () => {
  const file = await getFileFromPopWindow();
  if (file) {
    console.log("选择的文件:", file.name);
    // 可以在这里做其他处理，比如预览等
  }
};

const {
  tasks,
  clearCompletedTasks,
  getTaskTypeText,
  formatFileSize,
  getTaskStatusText,
  canClearCompletedTasks,
} = props.taskList;
</script>
