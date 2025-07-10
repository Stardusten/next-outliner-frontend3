<template>
  <div class="multi-select-component">
    <!-- TODO: 实现 MultiSelect 组件 -->
    <div class="text-sm text-muted-foreground">
      MultiSelect Component - {{ setting.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MultiSelectSetting } from "@/composables/useSettings";

defineProps<{
  setting: MultiSelectSetting;
}>();
</script>
