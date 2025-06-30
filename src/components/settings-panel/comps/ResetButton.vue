<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button variant="ghost" size="xs-icon" @click="resetSetting">
        <RefreshCcw class="size-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>重置</TooltipContent>
  </Tooltip>
</template>

<script setup lang="ts">
import { useSettings } from "@/composables";
import type { SettingItem } from "@/composables/useSettings";
import { Tooltip, TooltipTrigger, TooltipContent } from "../../ui/tooltip";
import { Button } from "../../ui/button";
import { RefreshCcw } from "lucide-vue-next";

const props = defineProps<{
  setting: SettingItem;
}>();

const settings = useSettings();

// 重置设置到默认值
const resetSetting = () => {
  settings.saveSetting(props.setting.storageKey, props.setting.defaultValue);
};
</script>
