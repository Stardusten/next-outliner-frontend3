<template>
  <div class="flex flex-col items-center justify-center h-screen">
    <div class="text-6xl mb-4">
      {{ notFoundEmojis[Math.floor(Math.random() * notFoundEmojis.length)] }}
    </div>
    <div class="text-lg">
      {{ $t("repoNotFound", { id: route.params.repoId }) }}
    </div>
    <Button
      @click="router.replace('/switch-repo')"
      class="mt-4"
      variant="outline"
    >
      <ArrowLeft />
      {{ $t("backToSwitchRepo") }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const notFoundEmojis = ["🥵", "🤔", "😭", "☹️", "😅"];
</script>
