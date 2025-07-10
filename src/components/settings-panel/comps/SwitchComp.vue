<template>
  <div class="flex items-center gap-2">
    <Switch
      :model-value="settings[props.setting.storageKey]"
      @update:model-value="handleValueChange"
      class="h-5 w-9"
    />
    <ResetButton :setting="setting" />
  </div>
</template>

<script setup lang="ts">
import { useSettings } from "@/composables";
import type { ToggleSetting } from "@/composables/useSettings";
import { Switch } from "../../ui/switch";
import ResetButton from "./ResetButton.vue";

const props = defineProps<{
  setting: ToggleSetting;
}>();

const { settings, saveSetting } = useSettings();

// 处理值变化
const handleValueChange = (value: boolean) => {
  saveSetting(props.setting.storageKey, value);
};
</script>
