<template>
  <NodeViewWrapper
    as="div"
    class="tag"
    :data-inherits="node.attrs.inherits.join(',')"
    :data-color="node.attrs.color"
    :data-fields="JSON.stringify(node.attrs.fields)"
  >
    <div class="flex flex-wrap">
      <NodeViewContent as="div" class="flex-0-0-auto pr-[4px]" />

      <div class="flex gap-1 items-center">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="secondary"
              size="2xs-icon"
              class="opacity-50 hover:opacity-100 transition-opacity"
              @click.stop="handleToggleFold"
            >
              <Settings class="size-[12px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ $t("tag.settings") }}
          </TooltipContent>
        </Tooltip>
      </div>

      <!-- 让文本透明，让光标在这个元素里面的时候不显示 -->
      <div
        class="flex-1 cursor-text text-transparent"
        contenteditable="false"
        @click.prevent="handleClickPad"
      ></div>
    </div>

    <!-- 设置面板 -->
    <Card
      v-if="blockData && !blockData.folded"
      class="w-full my-1 rounded-md relative"
      contenteditable="false"
    >
      <CardHeader class="hidden" />
      <!-- 右上角关闭按钮（纯 UI） -->
      <div class="absolute right-2 top-2">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="2xs-icon"
              @click.stop="handleToggleFold"
            >
              <X class="size-[12px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ $t("tag.close") }}</TooltipContent>
        </Tooltip>
      </div>
      <CardContent class="space-y-6">
        <!-- <div class="space-y-2">
          <Label class="text-sm">{{ $t("标签类型") }}</Label>
          <p class="text-xs text-muted-foreground">
            {{ $t("选择标签的类型或作用模式，仅用于展示") }}
          </p>
          <Select v-model="mode">
            <SelectTrigger class="w-[220px]">
              <SelectValue :placeholder="$t('请选择')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">{{ $t("默认") }}</SelectItem>
              <SelectItem value="highlight">{{ $t("高亮") }}</SelectItem>
              <SelectItem value="reference">{{ $t("引用") }}</SelectItem>
            </SelectContent>
          </Select>
        </div> -->

        <!-- 颜色选择器 -->
        <div class="space-y-1">
          <h2 class="text-sm">{{ $t("tag.colorLabel") }}</h2>
          <p class="text-xs text-muted-foreground mb-4">
            {{ $t("tag.colorDesc") }}
          </p>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="c in colorOptions"
              :key="c.key"
              type="button"
              class="rounded-full p-[2px]"
              :aria-pressed="selectedColor === c.key"
              @click="handleSelectColor(c.key)"
            >
              <button
                class="w-7 h-7 rounded-full p-0 relative"
                :class="[
                  c.bg,
                  selectedColor === c.key
                    ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground'
                    : 'ring-0',
                ]"
              >
                <span
                  v-if="c.isNone"
                  class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[2px] bg-foreground rotate-45 rounded"
                />
              </button>
            </button>
          </div>
        </div>

        <!-- 继承块输入框 -->
        <div class="space-y-1">
          <h2 class="text-sm">{{ $t("tag.inheritsLabel") }}</h2>
          <p class="text-xs text-muted-foreground mb-2">
            {{ $t("tag.inheritsDesc") }}
          </p>
          <Input
            v-model="inheritsText"
            :placeholder="$t('tag.inheritsPlaceholder')"
            class="w-full max-w-[380px]"
            @input="inheritsError = ''"
          />
          <p
            v-if="inheritsError"
            class="text-sm text-destructive mt-3 flex items-center gap-2"
          >
            <AlertCircle class="size-4" />
            {{ inheritsError }}
          </p>
        </div>
      </CardContent>

      <!-- 字段设置 -->
      <CardContent class="pt-0">
        <TagFieldsEditor v-model="fields" />
      </CardContent>
      <CardFooter class="flex justify-end gap-2">
        <Button
          variant="outline"
          @click.stop="handleDiscard"
          :disabled="!isDirty"
        >
          {{ $t("tag.discard") }}
        </Button>
        <Button @click.stop="handleSave" :disabled="!isDirty">{{
          $t("tag.save")
        }}</Button>
      </CardFooter>
    </Card>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import {
  toggleFocusedFoldState,
  updateTagBlockAttrs,
} from "@/lib/app-views/editable-outline/commands";
import type { BlockId } from "@/lib/common/types";
import type { TagField } from "@/lib/tiptap/nodes/tag";
import { TextSelection } from "@tiptap/pm/state";
import { NodeViewContent, nodeViewProps } from "@tiptap/vue-3";
import { AlertCircle, Settings, X } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { NodeViewWrapper } from "./NodeViewWrapper";
import TagFieldsEditor from "./tag-fields/TagFieldsEditor.vue";

const props = defineProps(nodeViewProps);
const { node, editor, getPos, updateAttributes } = props;
const { t } = useI18n();

const blockId = computed(() => {
  const pos = getPos();
  if (pos === undefined) return null;
  const $pos = editor.view.state.doc.resolve(pos);
  const listItem = $pos.parent;
  return listItem.attrs.blockId;
});

const blockData = computed(() => {
  if (!blockId.value) return null;
  return editor.appView.app.getReactiveBlockData(blockId.value).value;
});

const inheritsText = ref<string>("");
const selectedColor = ref<string>("none");
const initialState = ref<{
  color: string;
  inherits: string;
  fields: TagField[];
} | null>(null);
const fields = ref<TagField[]>([]);
const isDirty = computed(() => {
  if (!initialState.value) return false;
  const currentColor =
    selectedColor.value === "none" ? "" : selectedColor.value;
  const currentInherits = inheritsText.value.trim();
  const fieldsChanged = !areFieldsEqual(
    fields.value,
    initialState.value.fields
  );
  return (
    initialState.value.color !== currentColor ||
    initialState.value.inherits !== currentInherits ||
    fieldsChanged
  );
});
const inheritsError = ref<string>("");
const colorOptions = [
  { key: "none", bg: "bg-zinc-400", isNone: true },
  { key: "magenta", bg: "bg-fuchsia-500" },
  { key: "orange", bg: "bg-orange-500" },
  { key: "amber", bg: "bg-amber-400" },
  { key: "yellow", bg: "bg-yellow-400" },
  { key: "lime", bg: "bg-lime-500" },
  { key: "green", bg: "bg-emerald-500" },
  { key: "teal", bg: "bg-teal-500" },
  { key: "blue", bg: "bg-blue-600" },
  { key: "indigo", bg: "bg-indigo-600" },
  { key: "violet", bg: "bg-violet-600" },
  { key: "pink", bg: "bg-pink-500" },
];

watch(
  () => node,
  (node) => {
    const attrs = node.attrs;
    // TODO
    selectedColor.value = attrs.color || "none";
    inheritsText.value = Array.isArray(attrs.inherits)
      ? (attrs.inherits as string[]).join(",")
      : "";
    fields.value = Array.isArray(attrs.fields)
      ? (attrs.fields as TagField[])
      : [];
    // 记录初始状态用于脏检查
    initialState.value = {
      color: attrs.color || "",
      inherits: Array.isArray(attrs.inherits)
        ? (attrs.inherits as string[]).join(",")
        : "",
      fields: cloneFields(fields.value),
    };
  },
  { immediate: true }
);

const handleToggleFold = () => {
  if (!blockId.value) return;
  const cmd = toggleFocusedFoldState(editor, undefined, blockId.value);
  editor.appView.execCommand(cmd, true);
};

const handleClickPad = () => {
  const pos = getPos();
  if (pos === undefined) return;
  const tr = editor.view.state.tr;
  const $pos = editor.view.state.doc.resolve(pos + node.nodeSize);
  const end = TextSelection.findFrom($pos, -1);
  if (!end) return;
  tr.setSelection(end);
  editor.view.dispatch(tr);
};

const handleSelectColor = (key: string) => {
  selectedColor.value = key;
};

const handleSave = () => {
  if (!blockId.value) return;

  inheritsError.value = "";
  const parsed = parseInherits(inheritsText.value);
  if (!parsed.success) {
    inheritsError.value = parsed.msg;
    return;
  }

  const patch = {
    inherits: parsed.blockIds,
    color: selectedColor.value === "none" ? "" : selectedColor.value,
  };
  const cmd = updateTagBlockAttrs(editor, blockId.value, patch);
  editor.appView.execCommand(cmd, true);

  toast.success(t("tag.attrsUpdated"));

  // 保存后更新初始状态
  initialState.value = {
    color: selectedColor.value === "none" ? "" : selectedColor.value,
    inherits: inheritsText.value.trim(),
    fields: cloneFields(fields.value),
  };
};

const parseInherits = (input: string) => {
  if (input.trim() === "")
    return { success: true, blockIds: [] as BlockId[] } as const;
  const reg = /^\d+@\d+(,\d+@\d+)*$/;
  if (!reg.test(input))
    return {
      success: false,
      msg: t("tag.invalidFormat", { example: "$id1,$id2,$id3" }) as string,
    } as const;

  const blockIds = input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s as BlockId);

  const app = editor.appView.app;
  for (const blockId of blockIds) {
    const node = app.getBlockNode(blockId);
    if (!node)
      return {
        success: false,
        msg: t("tag.blockNotExists", { id: blockId }) as string,
      } as const;
  }
  return { success: true, blockIds } as const;
};

const handleDiscard = () => {
  if (!initialState.value) return;
  // 恢复为初始 UI 值
  selectedColor.value = initialState.value.color || "none";
  inheritsText.value = initialState.value.inherits;
  fields.value = cloneFields(initialState.value.fields);
};

// TODO
function cloneFields(src: TagField[]): TagField[] {
  return src.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type,
    optional: f.optional,
    optionsMode: (f as any).optionsMode,
    options: Array.isArray((f as any).options)
      ? ([...(f as any).options] as string[])
      : undefined,
    fromTag: (f as any).fromTag,
  })) as TagField[];
}

// TODO
function areFieldsEqual(a: TagField[], b: TagField[]): boolean {
  if (a.length !== b.length) return false;
  const ca = cloneFields(a);
  const cb = cloneFields(b);
  return JSON.stringify(ca) === JSON.stringify(cb);
}
</script>
