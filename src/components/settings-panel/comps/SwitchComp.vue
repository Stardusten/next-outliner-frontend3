<template>
  <div class="switch-component">
    <!-- TODO: 实现 Switch 组件 -->
    <div class="text-sm text-muted-foreground">
      Switch Component - {{ setting.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToggleSetting } from "@/composables/useSettings";

defineProps<{
  setting: ToggleSetting;
}>();
</script>
