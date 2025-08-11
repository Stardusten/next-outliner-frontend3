<template>
  <div class="space-y-3" contenteditable="false">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm">{{ $t("tag.fieldsLabel") }}</h2>
        <p class="text-xs text-muted-foreground">{{ $t("tag.fieldsDesc") }}</p>
      </div>
      <Button variant="outline" size="sm" @click="addField">
        <Plus />
        {{ $t("tag.addField") }}
      </Button>
    </div>

    <span
      v-if="localFields.length === 0"
      class="text-sm text-warning flex items-center gap-2"
    >
      <AlertCircle class="size-4" />
      {{ $t("tag.noFieldPlaceholder") }}
    </span>

    <div class="space-y-4">
      <div
        v-for="(f, i) in localFields"
        :key="f.id"
        class="relative pl-8 space-y-3"
      >
        <!-- 序号指示器 - 绝对定位在左上角 -->
        <div
          class="absolute left-0 top-0 w-6 h-6 flex items-center justify-center"
        >
          <span class="text-xs text-muted-foreground font-medium"
            >#{{ i + 1 }}</span
          >
        </div>

        <div class="flex gap-3 items-start">
          <!-- 字段名 - 自适应宽度 -->
          <div class="flex-1 space-y-2">
            <Label class="text-xs">{{ $t("tag.fieldLabel") }}</Label>
            <Input
              v-model="f.label"
              :placeholder="$t('tag.fieldLabelPlaceholder')"
            />
          </div>

          <!-- 类型 - 固定宽度 -->
          <div class="w-32 space-y-2">
            <Label class="text-xs">{{ $t("tag.fieldType") }}</Label>
            <Select v-model="f.type">
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="$t('tag.selectPlaceholder')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">{{ $t("tag.type.text") }}</SelectItem>
                <SelectItem value="single">{{
                  $t("tag.type.single")
                }}</SelectItem>
                <SelectItem value="multiple">{{
                  $t("tag.type.multiple")
                }}</SelectItem>
                <SelectItem value="date">{{ $t("tag.type.date") }}</SelectItem>
                <SelectItem value="number">{{
                  $t("tag.type.number")
                }}</SelectItem>
                <SelectItem value="checkbox">{{
                  $t("tag.type.checkbox")
                }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 可选 - 固定宽度 -->
          <div class="w-8 space-y-2 ml-2">
            <Label class="text-xs">{{ $t("tag.fieldOptional") }}</Label>
            <div class="h-9 flex items-center justify-start">
              <Switch v-model:checked="f.optional" />
            </div>
          </div>

          <!-- 右侧操作按钮列 - 固定宽度 -->
          <div class="w-24 flex justify-end gap-1 items-center mt-7">
            <Button
              size="2xs-icon"
              variant="ghost"
              :disabled="i === 0"
              @click="moveFieldUp(i)"
            >
              <ArrowUp />
            </Button>
            <Button
              size="2xs-icon"
              variant="ghost"
              :disabled="i === localFields.length - 1"
              @click="moveFieldDown(i)"
            >
              <ArrowDown />
            </Button>
            <Button
              size="2xs-icon"
              variant="ghost"
              class="text-destructive"
              @click="removeField(f.id)"
            >
              <Trash />
            </Button>
          </div>
        </div>

        <div
          v-if="f.type === 'single' || f.type === 'multiple'"
          class="space-y-4"
        >
          <div class="space-y-2">
            <Label class="text-xs">{{ $t("tag.optionsSource") }}</Label>
            <Select v-model="f.optionsMode">
              <SelectTrigger class="w-50">
                <SelectValue :placeholder="$t('tag.selectPlaceholder')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">{{
                  $t("tag.optionsSourceManual")
                }}</SelectItem>
                <SelectItem value="fromTag">{{
                  $t("tag.optionsSourceFromTag")
                }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-if="f.optionsMode === 'manual'" class="space-y-2">
            <div class="flex items-center gap-2">
              <Input
                v-model="newOption"
                :placeholder="$t('tag.addOptionPlaceholder')"
                class="w-50"
              />
              <Button variant="outline" @click="addOption(f)">
                <Plus />{{ $t("tag.addOption") }}</Button
              >
            </div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(opt, idx) in f.options"
                :key="idx"
                class="flex items-center gap-1 px-2 py-[4px] rounded-md bg-muted text-xs"
              >
                <span>{{ opt }}</span>
                <Button
                  class="size-4 px-0! cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                  variant="ghost"
                  @click="removeOption(f, idx)"
                >
                  <X class="size-3" />
                </Button>
              </div>
            </div>
          </div>

          <div v-else class="space-y-2">
            <Label class="text-xs">{{ $t("tag.optionsFromTagLabel") }}</Label>
            <Input
              v-model="f.fromTag"
              :placeholder="$t('tag.optionsFromTagPlaceholder')"
              class="max-w-[280px]"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nanoid } from "nanoid";
import { ref } from "vue";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Switch } from "../../ui/switch";
import type { TagField } from "@/lib/tiptap/nodes/tag";
import {
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  X,
  Info,
  AlertCircle,
} from "lucide-vue-next";

const localFields = defineModel<TagField[]>({ default: [] });
const newOption = ref("");

function addField() {
  localFields.value.push({
    id: nanoid(),
    label: "",
    type: "text",
    optional: false,
  });
}

function removeField(id: string) {
  localFields.value = localFields.value.filter((f) => f.id !== id);
}

function addOption(field: TagField) {
  const v = newOption.value.trim();
  if (!v) return;
  if (field.type === "single" || field.type === "multiple") {
    if (!field.options) field.options = [];
    field.options.push(v);
    if (!field.optionsMode) field.optionsMode = "manual";
  }
  newOption.value = "";
}

function removeOption(field: TagField, idx: number) {
  if (field.type === "single" || field.type === "multiple") {
    field.options?.splice(idx, 1);
  }
}

function moveFieldUp(index: number) {
  if (index <= 0) return;
  const arr = localFields.value;
  [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
}

function moveFieldDown(index: number) {
  const arr = localFields.value;
  if (index >= arr.length - 1) return;
  [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
}
</script>
