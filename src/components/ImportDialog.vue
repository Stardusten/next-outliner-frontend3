<template>
  <AlertDialog :open="importDialogVisible">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>导入确认</AlertDialogTitle>
        <AlertDialogDescription>
          检测到 <strong>{{ importBlockCount }}</strong> 个块，是否确定导入？
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleImportCancel">取消</AlertDialogCancel>
        <AlertDialogAction @click="handleImportConfirm"
          >确认导入</AlertDialogAction
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
import type { useImportExport } from "@/composables";

const props = defineProps<{
  importExport: ReturnType<typeof useImportExport>;
}>();

const {
  importDialogVisible,
  importBlockCount,
  handleImportConfirm,
  handleImportCancel,
} = props.importExport;
</script>

<style scoped>
strong {
  color: var(--foreground);
  font-weight: 600;
}
</style>
