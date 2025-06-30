<template>
  <div class="flex items-center gap-2">
    <Input
      :model-value="currentValue"
      @update:model-value="handleValueChange"
      :type="setting.hidden ? 'password' : 'text'"
      :placeholder="setting.placeholder"
      :maxlength="setting.maxLength"
      class="w-[240px] text-sm"
    />
    <ResetButton :setting="setting" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSettings } from "@/composables";
import type { InputSetting } from "@/composables/useSettings";
import { Input } from "../../ui/input";
import ResetButton from "./ResetButton.vue";

const props = defineProps<{
  setting: InputSetting;
}>();

const { getSetting, saveSetting } = useSettings();

// 当前值
const currentValue = computed(() => {
  return getSetting(props.setting.storageKey) ?? props.setting.defaultValue;
});

// 处理值变化
const handleValueChange = (value: string | number) => {
  saveSetting(props.setting.storageKey, String(value));
};
</script>
