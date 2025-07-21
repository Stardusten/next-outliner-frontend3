<template>
  <div class="flex bg-muted rounded-md p-0.5 gap-0.5 -my-1">
    <span
      class="px-1.5 py-1 text-xs rounded cursor-pointer transition-all duration-200 text-muted-foreground whitespace-nowrap text-center min-w-8"
      :class="{ 'bg-primary text-primary-foreground': isLight }"
      @click="setLight"
    >
      明亮
    </span>
    <span
      class="px-1.5 py-1 text-xs rounded cursor-pointer transition-all duration-200 text-muted-foreground whitespace-nowrap text-center min-w-8"
      :class="{ 'bg-primary text-primary-foreground': isDark }"
      @click="setDark"
    >
      黑暗
    </span>
    <span
      class="px-1.5 py-1 text-xs rounded cursor-pointer transition-all duration-200 text-muted-foreground whitespace-nowrap text-center min-w-8"
      :class="{ 'bg-primary text-primary-foreground': isSystem }"
      @click="setSystem"
    >
      跟随系统
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSettings } from "@/composables";

const { getSetting, saveSetting } = useSettings();

// 创建响应式引用
const themeRef = computed({
  get: () => getSetting("ui.theme") || "light",
  set: (value: string) => saveSetting("ui.theme", value),
});

const setLight = () => (themeRef.value = "light");
const setDark = () => (themeRef.value = "dark");
const setSystem = () => (themeRef.value = "system");

const isLight = computed(() => themeRef.value === "light");
const isDark = computed(() => themeRef.value === "dark");
const isSystem = computed(() => themeRef.value === "system");
</script>
