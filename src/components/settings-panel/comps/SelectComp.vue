<template>
  <div class="flex items-center gap-2">
    <Select v-model="currentValue">
      <SelectTrigger class="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        class="max-h-[var(--radix-select-content-available-height)]"
      >
        <SelectItem
          v-for="option in setting.options"
          :key="option.id"
          :value="option.id"
        >
          {{ option.label }}
        </SelectItem>
      </SelectContent>
    </Select>
    <ResetButton :setting="setting" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSettings } from "@/composables";
import type { SingleSelectSetting } from "@/composables/useSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import ResetButton from "./ResetButton.vue";

const props = defineProps<{
  setting: SingleSelectSetting;
}>();

const settings = useSettings();

// 创建响应式的设置值
const currentValue = computed({
  get: () =>
    settings.getSetting(props.setting.storageKey) ?? props.setting.defaultValue,
  set: (value: string) => settings.saveSetting(props.setting.storageKey, value),
});
</script>
