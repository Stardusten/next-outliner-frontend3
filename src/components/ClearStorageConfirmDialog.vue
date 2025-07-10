<template>
  <AlertDialog
    :open="clearHistoryDialogVisible"
    @update:open="handleOpenChange"
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认清空历史版本</AlertDialogTitle>
        <AlertDialogDescription>
          <div class="space-y-2">
            <p>此操作将删除所有历史版本，仅保留当前最新快照，无法恢复。</p>
            <p class="text-destructive font-medium">
              请谨慎操作，清空前建议先导出快照备份。
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleClearHistoryCancel"
          >取消</AlertDialogCancel
        >
        <Button variant="destructive" @click="handleClearHistoryConfirm"
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
  clearHistoryDialogVisible,
  handleClearHistoryConfirm,
  handleClearHistoryCancel,
} = props.importExport;

const handleOpenChange = (open: boolean) => {
  if (!open) {
    handleClearHistoryCancel();
  }
};
</script>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>
