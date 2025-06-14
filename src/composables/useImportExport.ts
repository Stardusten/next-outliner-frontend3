import { ref } from "vue";
import type { BlockStorage, ImportOptions } from "@/lib/storage/interface";

export function useImportExport(getBlockStorage: () => BlockStorage) {
  // 导入功能状态
  const importDialogVisible = ref(false);
  const importConflictCount = ref(0);
  let pendingImportData: { content: string; precheck: any } | null = null;

  // 清空存储确认状态
  const clearStorageDialogVisible = ref(false);

  // 导出功能
  const handleExport = () => {
    const blockStorage = getBlockStorage();
    blockStorage.export();
  };

  // 导入功能
  const handleImport = async (file: File) => {
    const blockStorage = getBlockStorage();

    try {
      const content = await file.text();

      // 预检查导入数据
      const precheck = await blockStorage.preCheckImport(content);

      if (!precheck.valid) {
        alert(`导入文件有错误：\n${precheck.errors.join("\n")}`);
        return;
      }

      // 如果没有冲突，直接导入
      if (precheck.conflictingIds.length === 0) {
        const result = await blockStorage.import(content, {
          conflictResolution: "skip", // 没有冲突时用什么策略都一样
          clearExisting: false,
        });

        if (result.success) {
          alert(`导入成功！共导入 ${result.imported} 个块`);
          location.reload();
        } else {
          alert(`导入失败：${result.message}`);
        }
        return;
      }

      // 有冲突，显示对话框让用户选择
      pendingImportData = { content, precheck };
      importConflictCount.value = precheck.conflictingIds.length;
      importDialogVisible.value = true;
    } catch (error) {
      alert(`读取文件失败：${error}`);
    }
  };

  // 处理导入确认
  const handleImportConfirm = async (strategy: ImportOptions["conflictResolution"]) => {
    if (!pendingImportData) return;

    const blockStorage = getBlockStorage();

    try {
      const result = await blockStorage.import(pendingImportData.content, {
        conflictResolution: strategy,
        clearExisting: false,
      });

      if (result.success) {
        alert(`导入成功！\n${result.message}`);
        location.reload();
      } else {
        alert(`导入失败：${result.message}\n\n错误详情：\n${result.errors.join("\n")}`);
      }
    } catch (error) {
      alert(`导入失败：${error}`);
    } finally {
      handleImportCancel();
    }
  };

  // 处理导入取消
  const handleImportCancel = () => {
    importDialogVisible.value = false;
    importConflictCount.value = 0;
    pendingImportData = null;
  };

  // 清空存储功能
  const handleClearStorage = () => {
    clearStorageDialogVisible.value = true;
  };

  // 确认清空存储
  const handleClearStorageConfirm = () => {
    const blockStorage = getBlockStorage();
    blockStorage.clear("user-clear");
    clearStorageDialogVisible.value = false;
    alert("存储已清空！");
    location.reload();
  };

  // 取消清空存储
  const handleClearStorageCancel = () => {
    clearStorageDialogVisible.value = false;
  };

  return {
    // 状态
    importDialogVisible,
    importConflictCount,
    clearStorageDialogVisible,

    // 方法
    handleExport,
    handleImport,
    handleImportConfirm,
    handleImportCancel,
    handleClearStorage,
    handleClearStorageConfirm,
    handleClearStorageCancel,
  };
}
