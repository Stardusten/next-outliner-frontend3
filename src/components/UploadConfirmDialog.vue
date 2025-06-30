<template>
  <Dialog :open="uploadConfirmVisible" @update:open="handleOpenChange">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>确认上传</DialogTitle>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <!-- 文件信息 -->
        <div class="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
          <div class="text-primary">
            <FileText v-if="isTextFile" :size="32" />
            <Image v-else-if="isImageFile" :size="32" />
            <FileVideo v-else-if="isVideoFile" :size="32" />
            <FileAudio v-else-if="isAudioFile" :size="32" />
            <Archive v-else-if="isArchiveFile" :size="32" />
            <File v-else :size="32" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm truncate">{{ fileName }}</div>
            <div
              class="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span>{{ fileType }}</span>
              <span>•</span>
              <span>{{ formatFileSize(fileSize) }}</span>
            </div>
          </div>
        </div>

        <!-- 上传选项 -->
        <div class="space-y-3">
          <Label for="upload-prefix">上传目录</Label>
          <Input
            id="upload-prefix"
            v-model="uploadPrefix"
            placeholder="留空表示根目录，如：images/2024/"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleCancel">取消</Button>
        <Button @click="handleConfirm">开始上传</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  FileText,
  Image,
  FileVideo,
  FileAudio,
  Archive,
  File,
} from "lucide-vue-next";
import type { useAttachment } from "@/composables";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const props = defineProps<{
  attachment: ReturnType<typeof useAttachment>;
}>();

const {
  uploadConfirmVisible,
  selectedFile,
  handleUploadConfirm,
  handleUploadCancel,
} = props.attachment;

// 上传前缀
const uploadPrefix = ref("");

// 处理对话框开关状态变化
const handleOpenChange = (open: boolean) => {
  if (!open) {
    handleUploadCancel();
  }
};

// 文件信息计算属性
const fileName = computed(() => selectedFile.value?.name || "");
const fileSize = computed(() => selectedFile.value?.size || 0);
const fileType = computed(() => {
  if (!selectedFile.value) return "";
  const type = selectedFile.value.type;
  if (type) {
    // 提取主要类型，如 "image/jpeg" -> "JPEG 图片"
    const [category, subtype] = type.split("/");
    switch (category) {
      case "image":
        return `${subtype.toUpperCase()} 图片`;
      case "video":
        return `${subtype.toUpperCase()} 视频`;
      case "audio":
        return `${subtype.toUpperCase()} 音频`;
      case "text":
        return `${subtype.toUpperCase()} 文本`;
      case "application":
        if (subtype.includes("pdf")) return "PDF 文档";
        if (subtype.includes("zip") || subtype.includes("rar"))
          return "压缩文件";
        if (subtype.includes("json")) return "JSON 文件";
        if (subtype.includes("xml")) return "XML 文件";
        return "应用程序文件";
      default:
        return type;
    }
  }
  // 根据文件扩展名推断
  const ext = fileName.value.split(".").pop()?.toLowerCase();
  if (ext) {
    const extMap: Record<string, string> = {
      txt: "文本文件",
      md: "Markdown 文件",
      pdf: "PDF 文档",
      doc: "Word 文档",
      docx: "Word 文档",
      xls: "Excel 表格",
      xlsx: "Excel 表格",
      ppt: "PowerPoint 演示",
      pptx: "PowerPoint 演示",
      zip: "压缩文件",
      rar: "压缩文件",
      "7z": "压缩文件",
    };
    return extMap[ext] || `${ext.toUpperCase()} 文件`;
  }
  return "未知类型";
});

// 文件类型判断
const isTextFile = computed(() => {
  if (!selectedFile.value) return false;
  return (
    selectedFile.value.type.startsWith("text/") ||
    fileName.value.match(/\.(txt|md|json|xml|csv)$/i)
  );
});

const isImageFile = computed(() => {
  if (!selectedFile.value) return false;
  return selectedFile.value.type.startsWith("image/");
});

const isVideoFile = computed(() => {
  if (!selectedFile.value) return false;
  return selectedFile.value.type.startsWith("video/");
});

const isAudioFile = computed(() => {
  if (!selectedFile.value) return false;
  return selectedFile.value.type.startsWith("audio/");
});

const isArchiveFile = computed(() => {
  if (!selectedFile.value) return false;
  return (
    selectedFile.value.type.includes("zip") ||
    selectedFile.value.type.includes("rar") ||
    fileName.value.match(/\.(zip|rar|7z|tar|gz)$/i)
  );
});

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

// 处理确认
const handleConfirm = () => {
  if (selectedFile.value) {
    handleUploadConfirm(selectedFile.value, uploadPrefix.value.trim());
  }
};

// 处理取消
const handleCancel = () => {
  uploadPrefix.value = "";
  handleUploadCancel();
};
</script>
