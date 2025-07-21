<template>
  <div class="flex items-center gap-2">
    <Switch
      :model-value="currentValue"
      @update:model-value="handleValueChange"
      class="h-5 w-9"
    />
    <ResetButton :setting="setting" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSettings } from "@/composables";
import type { ToggleSetting } from "@/composables/useSettings";
import { Switch } from "../../ui/switch";
import ResetButton from "./ResetButton.vue";

const props = defineProps<{
  setting: ToggleSetting;
}>();

const { getSetting, saveSetting } = useSettings();

// 当前值
const currentValue = computed(() => {
  if (!props.setting.settingPath) {
    return props.setting.defaultValue;
  }
  return getSetting(props.setting.settingPath) ?? props.setting.defaultValue;
});

// 处理值变化
const handleValueChange = (value: boolean) => {
  if (props.setting.settingPath) {
    saveSetting(props.setting.settingPath, value);
  }
};
</script>
