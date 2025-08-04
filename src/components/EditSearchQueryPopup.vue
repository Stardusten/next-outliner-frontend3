<template>
  <Popover v-model:open="open">
    <PopoverTrigger>
      <Tooltip>
        <TooltipTrigger as-child>
          <slot />
        </TooltipTrigger>
        <TooltipContent>
          {{ $t("listItem.editSearchQuery") }}
        </TooltipContent>
      </Tooltip>
    </PopoverTrigger>

    <!-- 弹窗内容 -->
    <PopoverContent
      side="bottom"
      align="start"
      :side-offset="8"
      :align-offset="0"
      class="w-80 p-3"
    >
      <div class="space-y-3">
        <div class="space-y-2">
          <Label class="text-sm font-medium">{{
            $t("editSearchQueryPopup.queryLabel")
          }}</Label>
          <Input
            v-model="queryText"
            :placeholder="$t('editSearchQueryPopup.queryPlaceholder')"
          />
        </div>

        <div class="flex justify-between">
          <div>
            <a class="text-sm text-muted-foreground cursor-pointer">语法说明</a>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" @click="open = false">
              {{ $t("editSearchQueryPopup.cancel") }}
            </Button>
            <Button size="sm" @click="handleSubmit">
              {{ $t("editSearchQueryPopup.save") }}
            </Button>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ref, watch } from "vue";
import { Label } from "./ui/label";

const props = defineProps<{
  initQuery?: string;
  onSubmit: (query: string) => void;
}>();

const queryText = ref("");
const open = ref(false);

watch(open, (isOpen) => {
  if (isOpen) {
    queryText.value = props.initQuery || "";
  }
});

const handleSubmit = () => {
  props.onSubmit(queryText.value);
  open.value = false;
};
</script>
