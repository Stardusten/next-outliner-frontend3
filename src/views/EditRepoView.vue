<template>
  <div class="flex flex-col h-screen">
    <RepoNotFound v-if="!repoConfig || !app" />
    <MainEditor v-else :app="app" :repo-config="repoConfig" />
  </div>
</template>

<script setup lang="ts">
import "prosemirror-view/style/prosemirror.css";
import { computed, watch } from "vue";

import { useRepoConfigs } from "@/composables/useRepoConfigs";
import type { App } from "@/lib/app/app";
import { useRoute } from "vue-router";
import MainEditor from "./edit-repo/MainEditor.vue";
import RepoNotFound from "./edit-repo/RepoNotFound.vue";
import { createRepo, instantiateApp, type Repo } from "@/lib/repo/repo";

const route = useRoute();
const repoConfigs = useRepoConfigs();

const repoConfig = computed(() => {
  const repoId = route.params.repoId as string;
  return repoConfigs.getConfig(repoId);
});

let repo: Repo | null = null;
let app: App | null = null;

const reset = () => {
  repo = null;
  app = null;
};

watch(
  repoConfig,
  async () => {
    reset();
    if (!repoConfig.value) return;
    console.info("repoConfig changed", repoConfig.value);

    repo = createRepo(repoConfig.value);
    console.info("repo instantiated successfully!");

    app = instantiateApp(repo);
    console.info("app instantiated successfully!");
  },
  { immediate: true }
);
</script>
