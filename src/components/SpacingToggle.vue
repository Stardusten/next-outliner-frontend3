<template>
  <div class="spacing-toggle">
    <span
      class="spacing-option"
      :class="{ active: lineSpacing.isCompact.value }"
      @click="lineSpacing.setCompact"
    >
      {{ lineSpacing.options.compact.label }}
    </span>
    <span
      class="spacing-option"
      :class="{ active: lineSpacing.isNormal.value }"
      @click="lineSpacing.setNormal"
    >
      {{ lineSpacing.options.normal.label }}
    </span>
    <span
      class="spacing-option"
      :class="{ active: lineSpacing.isLoose.value }"
      @click="lineSpacing.setLoose"
    >
      {{ lineSpacing.options.loose.label }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useLineSpacing } from "../composables/useLineSpacing";

const lineSpacing = useLineSpacing();
</script>

<style scoped>
.spacing-toggle {
  display: flex;
  background: var(--toggle-bg);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
  /* 负边距让 toggle 不要撑开菜单项 */
  margin: -4px 0 -4px 0;
}

.spacing-option {
  padding: 4px 6px;
  font-size: 11px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--menu-text-muted);
  min-width: 24px;
  text-align: center;
}

.spacing-option.active {
  background: var(--toggle-bg-active);
  color: white;
}
</style>
