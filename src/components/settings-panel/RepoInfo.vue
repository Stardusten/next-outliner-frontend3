<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <div class="flex">
        <Label class="text-sm font-semibold w-[100px]">
          {{ $t("settings.repo.basicInfo.repoName") }}
        </Label>
        <div class="text-sm text-muted-foreground">
          {{ currentRepo?.title ?? "<未知 Repo???>" }}
        </div>
      </div>

      <div class="flex">
        <Label class="text-sm w-[100px]">
          {{ $t("settings.repo.basicInfo.repoId") }}
        </Label>
        <div class="text-sm text-muted-foreground font-mono">
          {{ currentRepo?.id ?? "<未知 Repo ID???>" }}
        </div>
      </div>
    </div>

    <div class="flex gap-2">
      <Button variant="outline" @click="handleExportRepoConfigAsJson">
        {{ $t("settings.repo.basicInfo.exportAsJson") }}
      </Button>
      <Button variant="outline" @click="handleSwitchRepo">
        {{ $t("settings.repo.basicInfo.switchRepo") }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRepoConfigs } from "@/composables/useRepoConfigs";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { clipboard } from "@/lib/editor/utils";
import { toast } from "vue-sonner";
import { useRouter } from "vue-router";

const repoConfigs = useRepoConfigs();
const { currentRepo } = repoConfigs;
const router = useRouter();

const handleExportRepoConfigAsJson = () => {
  if (currentRepo.value) {
    const json = JSON.stringify(currentRepo.value, null, 2);
    clipboard.writeText(json);
    toast.success("知识库配置已复制到剪贴板");
  }
};

const handleSwitchRepo = () => {
  if (currentRepo.value) {
    router.push(`/switch-repo`);
  }
};
</script>
