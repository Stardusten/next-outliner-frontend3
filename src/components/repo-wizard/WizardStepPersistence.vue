<template>
  <div class="grid gap-3">
    <FormField name="persistence.type">
      <FormItem>
        <FormControl>
          <SingleSelect
            title="本地存储"
            description="数据存储在浏览器的 localStorage 中，简单快速"
            :selected="form.values.persistence?.type === 'local-storage'"
            @click="form.setFieldValue('persistence.type', 'local-storage')"
          />
          <div
            class="text-sm flex items-start gap-2 mt-2"
            :class="{
              'text-green-700':
                existStatus === 'valid' || existStatus === 'notFound',
              'text-orange-500': existStatus === 'corrupted',
            }"
            v-if="existStatus !== 'others'"
          >
            <msgIcon class="size-4 shrink-0 mt-1 ml-1" />
            <span class="flex-1 leading-relaxed">{{
              $t(`repoWizard.existStatus.${existStatus}`, {
                persistenceType,
                id,
              })
            }}</span>
          </div>
        </FormControl>
      </FormItem>
    </FormField>
  </div>
</template>

<script setup lang="ts">
import type { useRepoWizard } from "@/composables";
import SingleSelect from "./SingleSelect.vue";
import { FormControl, FormField, FormItem } from "../ui/form";
import { computed } from "vue";
import { checkExists } from "@/lib/persistence";
import { AlertCircle, Check, CheckCircle2 } from "lucide-vue-next";

const props = defineProps<{
  wizard: ReturnType<typeof useRepoWizard>;
}>();
const { form } = props.wizard;

const id = computed(() => form.values.id);
const persistenceType = computed(() => form.values.persistence?.type);

const existStatus = computed(() => {
  if (!id.value || !persistenceType.value) return "others";
  return checkExists(persistenceType.value, id.value);
});

const msgIcon = computed(() =>
  existStatus.value === "corrupted" ? AlertCircle : CheckCircle2
);
</script>
