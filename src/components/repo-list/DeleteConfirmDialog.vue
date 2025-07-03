<template>
  <AlertDialog v-model:open="open">
    <AlertDialogTrigger as-child>
      <slot />
    </AlertDialogTrigger>

    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认删除</AlertDialogTitle>
        <AlertDialogDescription>
          确定要删除知识库配置 "{{ toDelete.title }}" 吗？
          <br />
          此操作不可恢复，但不会删除实际的数据文件。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="cancelDelete()"> 取消 </AlertDialogCancel>
        <Button @click="confirmDelete()" variant="destructive"> 删除 </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { useRepoConfigs } from "@/composables/useRepoConfigs";
import { Button } from "../ui/button";
import type { RepoConfig } from "@/lib/repo/schema";

interface Props {
  toDelete: RepoConfig;
  repoConfig: ReturnType<typeof useRepoConfigs>;
}

const open = ref(false);
const props = defineProps<Props>();
const { toDelete, repoConfig } = props;

const cancelDelete = () => {
  open.value = false;
};

const confirmDelete = () => {
  repoConfig.removeConfig(toDelete.id);
};
</script>
