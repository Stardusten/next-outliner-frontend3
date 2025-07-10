<template>
  <div
    class="min-h-screen bg-muted dark:bg-muted flex items-center justify-center p-4"
  >
    <!-- 主卡片 -->
    <Card class="w-full max-w-md shadow-xl">
      <CardHeader class="text-center space-y-4">
        <div
          class="flex items-center justify-center gap-4 text-2xl font-medium mt-3"
        >
          <img src="/logo.png" alt="Next Outliner" class="size-12" />
          <span class="font-old-serif">Next Outliner 3</span>
        </div>
      </CardHeader>

      <CardContent class="space-y-4">
        <RepoList :repoConfig="repoConfig" />
      </CardContent>

      <CardFooter>
        <RepoWizard :wizard="wizard" :repo-configs="repoConfig" />
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import RepoList from "@/components/repo-list/RepoList.vue";
import DeleteConfirmDialog from "@/components/repo-list/DeleteConfirmDialog.vue";
import RepoWizard from "@/components/repo-wizard/RepoWizard.vue";
import { useRepoConfigs } from "@/composables/useRepoConfigs";
import { useRepoWizard } from "@/composables/useRepoWizard";
import { useSettings } from "@/composables";

const repoConfig = useRepoConfigs();
const wizard = useRepoWizard();
const settings = useSettings();

onMounted(() => {
  repoConfig.loadConfigs();
});
</script>

<style scoped>
/* 知识库切换页面样式 */
</style>
