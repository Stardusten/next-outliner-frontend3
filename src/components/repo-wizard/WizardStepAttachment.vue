<template>
  <div class="space-y-4 max-h-[60vh] overflow-y-auto px-1">
    <div class="grid gap-3">
      <template v-for="option in attachmentOptions" :key="option.value">
        <FormField name="attachment.type">
          <FormItem>
            <FormControl>
              <SingleSelect
                :title="option.title"
                :description="option.description"
                :selected="form.values.attachment?.type === option.value"
                @click="form.setFieldValue('attachment.type', option.value)"
              ></SingleSelect>
            </FormControl>
          </FormItem>
        </FormField>
      </template>
    </div>

    <!-- R2 配置表单 -->
    <div
      v-show="form.values.attachment?.type === 'r2'"
      class="space-y-3 p-4 bg-accent/30 rounded-lg border mt-4"
    >
      <h4 class="font-medium text-sm">R2 存储配置</h4>

      <div class="space-y-3">
        <FormField
          v-slot="{ componentField }"
          name="attachment.params.endpoint"
        >
          <FormItem>
            <Label class="text-xs">Endpoint</Label>
            <FormControl>
              <Input
                v-bind="componentField"
                placeholder="R2 Endpoint URL"
                class="text-sm"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="attachment.params.bucket">
          <FormItem>
            <Label class="text-xs">Bucket</Label>
            <FormControl>
              <Input
                v-bind="componentField"
                placeholder="Bucket 名称"
                class="text-sm"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField
          v-slot="{ componentField }"
          name="attachment.params.accessKeyId"
        >
          <FormItem>
            <Label class="text-xs">Access Key ID</Label>
            <FormControl>
              <Input
                v-bind="componentField"
                placeholder="R2 Access Key ID"
                class="text-sm"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField
          v-slot="{ componentField }"
          name="attachment.params.secretAccessKey"
        >
          <FormItem>
            <Label class="text-xs">Secret Access Key</Label>
            <FormControl>
              <Input
                v-bind="componentField"
                type="password"
                placeholder="R2 Secret Access Key"
                class="text-sm"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { useRepoWizard } from "@/composables/useRepoWizard";
import { FormControl, FormField, FormItem, FormMessage } from "../ui/form";
import SingleSelect from "./SingleSelect.vue";

const props = defineProps<{
  wizard: ReturnType<typeof useRepoWizard>;
}>();
const { form } = props.wizard;

const attachmentOptions = [
  {
    value: "none" as const,
    title: "不设置",
    description: "暂时不设置附件上传功能，之后可以随时修改",
  },
  {
    value: "r2" as const,
    title: "对象存储",
    description: "使用对象存储，支持大文件和多设备同步",
  },
];
</script>
