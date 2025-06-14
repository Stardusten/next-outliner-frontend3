<template>
  <div class="theme-toggle">
    <span
      class="theme-option"
      :class="{ active: theme.isLight.value && !theme.isFollowingSystem.value }"
      @click="theme.setLight"
    >
      明亮
    </span>
    <span
      class="theme-option"
      :class="{ active: theme.isDark.value && !theme.isFollowingSystem.value }"
      @click="theme.setDark"
    >
      黑暗
    </span>
    <span
      class="theme-option"
      :class="{ active: theme.isFollowingSystem.value }"
      @click="theme.clearUserPreference"
    >
      跟随系统
    </span>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from "../composables/useTheme";

const theme = useTheme();
</script>

<style scoped>
.theme-toggle {
  display: flex;
  background: var(--toggle-bg);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
  /* 负边距让 toggle 不要撑开菜单项 */
  margin: -4px 0 -4px 0;
}

.theme-option {
  padding: 4px 6px;
  font-size: 11px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--menu-text-muted);
  white-space: nowrap;
  text-align: center;
  min-width: 32px;
}

.theme-option.active {
  background: var(--toggle-bg-active);
  color: white;
}
</style>
