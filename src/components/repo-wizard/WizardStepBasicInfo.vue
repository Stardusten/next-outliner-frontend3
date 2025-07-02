<template>
  <div class="space-y-4">
    <FormField v-slot="{ componentField }" name="title">
      <FormItem>
        <FormLabel>知识库名称</FormLabel>
        <FormControl>
          <Input
            type="text"
            v-bind="componentField"
            @compositionend="form.validateField('title')"
            placeholder="例如：我的笔记本"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="id">
      <FormItem>
        <FormLabel>知识库 ID</FormLabel>
        <FormControl>
          <Input type="text" v-bind="componentField" />
        </FormControl>
        <FormDescription class="flex items-start gap-2 mt-2">
          <AlertCircle class="size-4 shrink-0 mt-0.5" />
          <span>{{ $t("repoWizard.idDesc") }}</span>
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>
  </div>
</template>

<script setup lang="ts">
import { Input } from "@/components/ui/input";
import type { useRepoWizard } from "@/composables/useRepoWizard";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { watch } from "vue";
import type { useRepoConfigs } from "@/composables/useRepoConfigs";
import { AlertCircle } from "lucide-vue-next";

const props = defineProps<{
  wizard: ReturnType<typeof useRepoWizard>;
  repoConfigs: ReturnType<typeof useRepoConfigs>;
}>();
const { repoConfigs, wizard } = props;
const { form } = wizard;
</script>
