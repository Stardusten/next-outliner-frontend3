<template>
  <div class="flex items-center gap-2">
    <NumberField
      v-model="currentValue"
      :min="setting.min"
      :max="setting.max"
      :step="setting.step ?? 1"
      class="w-[200px]"
    >
      <NumberFieldContent>
        <NumberFieldDecrement />
        <NumberFieldInput />
        <NumberFieldIncrement />
      </NumberFieldContent>
    </NumberField>

    <ResetButton :setting="setting" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSettings } from "@/composables";
import type { NumberSetting } from "@/composables/useSettings";
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldInput,
  NumberFieldIncrement,
} from "../../ui/number-field";
import ResetButton from "./ResetButton.vue";

const props = defineProps<{
  setting: NumberSetting;
}>();

const settings = useSettings();

// 创建响应式的设置值
const currentValue = computed({
  get: () =>
    settings.getSetting(props.setting.storageKey) ?? props.setting.defaultValue,
  set: (value: number) => settings.saveSetting(props.setting.storageKey, value),
});
</script>
