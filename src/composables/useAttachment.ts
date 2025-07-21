import { ref } from "vue";
import { toast } from "vue-sonner";
import type { App } from "@/lib/app/app";

// 上传确认对话框状态
const uploadConfirmVisible = ref(false);
const selectedFile = ref<File | null>(null);
const confirmCallback = ref<
  ((file: File, prefix: string) => Promise<void>) | null
>(null);

export interface UploadOptions {
  prefix?: string;
}

export const useAttachment = (app: App) => {
  /**
   * 从弹出窗口获取文件
   * @param accept 文件类型筛选，如 "image/*", ".pdf,.doc,.docx" 等
   * @returns Promise<File | null> 选中的文件，如果取消则返回 null
   */
  const getFileFromPopWindow = (
    accept: string = "*/*"
  ): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;

      input.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        resolve(file || null);
      };

      // 处理用户取消选择的情况
      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  };

  /**
   * 上传文件
   * @param file 要上传的文件
   * @param needConfirm 是否需要确认对话框
   * @param options 上传选项
   */
  const upload = async (
    file: File,
    needConfirm: boolean = false,
    options: UploadOptions = {}
  ): Promise<void> => {
    if (needConfirm) {
      // 需要确认，显示确认对话框
      selectedFile.value = file;
      confirmCallback.value = async (confirmedFile: File, prefix: string) => {
        await performUpload(confirmedFile, {
          prefix: prefix || options.prefix,
        });
      };
      uploadConfirmVisible.value = true;
      return;
    }

    // 直接上传
    await performUpload(file, options);
  };

  /**
   * 执行实际的上传操作
   */
  const performUpload = async (file: File, options: UploadOptions = {}) => {
    try {
      const attachmentStorage = app.attachmentStorage;
      if (!attachmentStorage) {
        toast.error("附件存储未配置");
        return;
      }

      toast.info(`开始上传文件：${file.name}`);

      const result = await attachmentStorage.upload(file, {
        prefix: options.prefix || undefined,
      });

      toast.success(`文件上传成功：${result.filename}`);
      console.log("上传结果:", result);
    } catch (error) {
      console.error("上传失败:", error);
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      toast.error(`上传失败：${errorMessage}`);
    }
  };

  /**
   * 处理上传确认（供确认对话框调用）
   */
  const handleConfirm = async (file: File, prefix: string) => {
    uploadConfirmVisible.value = false;
    if (confirmCallback.value) {
      await confirmCallback.value(file, prefix);
      confirmCallback.value = null;
    }
    selectedFile.value = null;
  };

  /**
   * 处理上传取消（供确认对话框调用）
   */
  const handleCancel = () => {
    uploadConfirmVisible.value = false;
    selectedFile.value = null;
    confirmCallback.value = null;
  };

  return {
    // 状态
    uploadConfirmVisible,
    selectedFile,

    // 方法
    getFileFromPopWindow,
    upload,
    handleConfirm,
    handleCancel,
  };
};
