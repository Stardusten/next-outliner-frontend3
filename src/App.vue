<template>
  <div class="h-screen">
    <TooltipProvider>
      <router-view />
      <Toaster position="top-right" :expand="true" richColors />
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import "prosemirror-view/style/prosemirror.css";
import "vue-sonner/style.css";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/sonner";
</script>

<style>
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKai-Regular.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKai-Light.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKai-Bold.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKaiMono-Regular.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKaiMono-Light.css");
@import url("https://cdn.jsdelivr.net/gh/satouriko/LxgwWenKai_Webfonts@v1.101/dist/LXGWWenKaiMono-Bold.css");

@import "./assets/base.css";
@import "./lib/editor/style/editor.css";

/* 行间距设置在 editor.css 中定义 */

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 14px;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
  background-color: transparent;
}

::-webkit-scrollbar-thumb {
  border-radius: 6px;
  background-color: oklch(0.5 0 0 / 0.3);
  transition: background-color 0.2s ease;
}

::-webkit-scrollbar-thumb:hover {
  background-color: oklch(0.5 0 0 / 0.5);
}

::-webkit-scrollbar-corner {
  background-color: var(--background);
}
</style>
