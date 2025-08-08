<template>
  <div class="h-screen">
    <TooltipProvider>
      <router-view />
      <Toaster position="top-right" :expand="true" richColors closeButton />
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import "prosemirror-view/style/prosemirror.css";
import "vue-sonner/style.css";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/sonner";
import { watch, onMounted } from "vue";
import { useRepoConfigs } from "./composables/useRepoConfigs";

const { currentRepo } = useRepoConfigs();

// 主题效果
const applyTheme = (themeValue: string) => {
  const root = document.documentElement;
  switch (themeValue) {
    case "light":
      root.classList.remove("dark");
      break;
    case "dark":
      root.classList.add("dark");
      break;
    case "system":
    default:
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", isDark);
      break;
  }
};

// 行间距效果
const spacingClasses = ["compact", "normal", "loose"];
const applySpacing = (spacing: string) => {
  const root = document.documentElement;
  spacingClasses.forEach((cls) => root.classList.remove(`spacing-${cls}`));
  if (spacing && spacingClasses.includes(spacing)) {
    root.classList.add(`spacing-${spacing}`);
  }
};

// 监听主题变化
watch(() => currentRepo.value?.ui?.theme || "light", applyTheme, {
  immediate: true,
});

// 监听行间距变化
watch(() => currentRepo.value?.editor?.lineSpacing || "normal", applySpacing, {
  immediate: true,
});

// 系统主题变化监听
onMounted(() => {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", (e) => {
    if ((currentRepo.value?.ui?.theme || "light") === "system") {
      document.documentElement.classList.toggle("dark", e.matches);
    }
  });
});
</script>

<style>
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKai-Regular.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKai-Light.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKai-Bold.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKaiMono-Regular.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKaiMono-Light.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKaiMono-Bold.css");

@import "./assets/base.css";
</style>
