import { ref } from "vue";
import { toast } from "vue-sonner";
import type { App } from "@/lib/app/app";

// 附件弹窗状态
const attachmentVisible = ref(false);
const attachmentPosition = ref({ x: 0, y: 0 });

// 上传确认对话框状态
const uploadConfirmVisible = ref(false);
const selectedFile = ref<File | null>(null);

export const useAttachment = (app: App) => {
  // 切换附件弹窗
  const toggleAttachment = (buttonElement?: HTMLElement) => {
    if (attachmentVisible.value) {
      attachmentVisible.value = false;
    } else {
      // 计算弹窗位置
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        attachmentPosition.value = {
          x: rect.right,
          y: rect.bottom,
        };
      }
      attachmentVisible.value = true;
    }
  };

  // 关闭附件弹窗
  const closeAttachment = () => {
    attachmentVisible.value = false;
  };

  // 处理上传操作
  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*/*";
    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        selectedFile.value = file;
        uploadConfirmVisible.value = true;
        attachmentVisible.value = false;
      }
    };
    input.click();
  };

  // 处理浏览操作
  const handleBrowse = () => {
    console.log("浏览文件");
  };

  // 处理上传确认
  const handleUploadConfirm = async (file: File, prefix: string) => {
    uploadConfirmVisible.value = false;
    selectedFile.value = null;

    try {
      // 获取附件存储实例
      const attachmentStorage = app.attachmentStorage;
      if (!attachmentStorage) {
        toast.error("附件存储未配置");
        return;
      }

      toast.info(`开始上传文件：${file.name}`);

      // 执行上传 - 任务会自动通过事件系统创建和更新
      const result = await attachmentStorage.upload(file, {
        prefix: prefix || undefined,
      });

      toast.success(`文件上传成功：${result.filename}`);
      console.log("上传结果:", result);
    } catch (error) {
      console.error("上传失败:", error);
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      toast.error(`上传失败：${errorMessage}`);
    }
  };

  // 处理上传取消
  const handleUploadCancel = () => {
    uploadConfirmVisible.value = false;
    selectedFile.value = null;
  };

  return {
    // 状态
    attachmentVisible,
    attachmentPosition,
    uploadConfirmVisible,
    selectedFile,

    // 方法
    toggleAttachment,
    closeAttachment,
    handleUpload,
    handleBrowse,
    handleUploadConfirm,
    handleUploadCancel,
  };
};
