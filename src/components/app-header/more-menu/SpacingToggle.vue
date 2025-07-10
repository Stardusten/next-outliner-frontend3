<template>
  <div class="flex bg-muted rounded-md p-0.5 gap-0.5 -my-1">
    <span
      class="px-1.5 py-1 text-xs rounded cursor-pointer transition-all duration-200 text-muted-foreground min-w-6 text-center"
      :class="{ 'bg-primary text-primary-foreground': isCompact }"
      @click="() => setSpacing('compact')"
    >
      {{ spacingOptions.compact.label }}
    </span>
    <span
      class="px-1.5 py-1 text-xs rounded cursor-pointer transition-all duration-200 text-muted-foreground min-w-6 text-center"
      :class="{ 'bg-primary text-primary-foreground': isNormal }"
      @click="() => setSpacing('normal')"
    >
      {{ spacingOptions.normal.label }}
    </span>
    <span
      class="px-1.5 py-1 text-xs rounded cursor-pointer transition-all duration-200 text-muted-foreground min-w-6 text-center"
      :class="{ 'bg-primary text-primary-foreground': isLoose }"
      @click="() => setSpacing('loose')"
    >
      {{ spacingOptions.loose.label }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSettings } from "@/composables";

const { settings, saveSetting } = useSettings();

// 创建响应式引用
const spacingRef = computed({
  get: () => settings.editorLineSpacing,
  set: (value: string) => saveSetting("editorLineSpacing", value),
});

const setSpacing = (val: string) => (spacingRef.value = val);

const isCompact = computed(() => spacingRef.value === "compact");
const isNormal = computed(() => spacingRef.value === "normal");
const isLoose = computed(() => spacingRef.value === "loose");

const spacingOptions = {
  compact: { label: "紧凑" },
  normal: { label: "正常" },
  loose: { label: "宽松" },
};
</script>
