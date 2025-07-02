<template>
  <div class="space-y-3">
    <!-- 空状态 -->
    <div
      v-if="configs.length === 0"
      class="text-center py-8 text-muted-foreground"
    >
      <p class="font-medium mb-1">{{ $t("repoList.noRepo") }}</p>
      <p class="text-sm">{{ $t("repoList.clickToAddRepo") }}</p>
    </div>

    <!-- 知识库列表 -->
    <div
      v-else
      v-for="config in configs"
      :key="config.id"
      class="group p-3 rounded-lg border border-border transition-colors hover:bg-accent"
    >
      <div class="flex items-center justify-between">
        <!-- 左侧：知识库信息 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-medium text-foreground text-sm truncate">
              {{ config.title || config.id }}
            </h3>
          </div>
          <p class="text-xs text-muted-foreground truncate">
            {{ config.id }}
          </p>
        </div>

        <!-- 右侧：删除按钮 -->
        <div class="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                class="size-7 text-muted-foreground hover:text-muted-foreground hover:bg-muted-foreground/10"
                size="icon"
                @click="openRepo(config.id)"
              >
                <Eye class="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent> {{ $t("repoList.openRepo") }} </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger>
              <DeleteConfirmDialog
                :to-delete="config"
                :repo-config="repoConfig"
              >
                <Button
                  variant="ghost"
                  class="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  size="icon"
                >
                  <Trash2 class="size-4" />
                </Button>
              </DeleteConfirmDialog>
            </TooltipTrigger>
            <TooltipContent> {{ $t("repoList.deleteRepo") }} </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-vue-next";
import type { useRepoConfigs } from "@/composables/useRepoConfigs";
import DeleteConfirmDialog from "./DeleteConfirmDialog.vue";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface Props {
  repoConfig: ReturnType<typeof useRepoConfigs>;
}

const props = defineProps<Props>();
const { configs, openRepo } = props.repoConfig;
</script>
