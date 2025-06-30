<template>
  <AlertDialog
    :open="clearStorageDialogVisible"
    @update:open="handleOpenChange"
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认清空存储</AlertDialogTitle>
        <AlertDialogDescription>
          <div class="space-y-2">
            <p>此操作将永久删除所有块数据，无法恢复。</p>
            <p class="text-destructive font-medium">
              请谨慎操作，建议在清空前先导出数据备份。
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleClearStorageCancel"
          >取消</AlertDialogCancel
        >
        <Button variant="destructive" @click="handleClearStorageConfirm"
          >确认清空</Button
        >
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useImportExport } from "@/composables/useImportExport";

const props = defineProps<{
  importExport: ReturnType<typeof useImportExport>;
}>();
const {
  clearStorageDialogVisible,
  handleClearStorageConfirm,
  handleClearStorageCancel,
} = props.importExport;

const handleOpenChange = (open: boolean) => {
  if (!open) {
    handleClearStorageCancel();
  }
};
</script>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>
