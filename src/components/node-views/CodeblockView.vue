<template>
  <NodeViewWrapper as="pre" :data-lang="node.attrs.lang" spellcheck="false">
    <NodeViewContent as="code" class="codeblock-content"> </NodeViewContent>

    <div
      v-if="focused"
      class="flex gap-2 absolute right-0 -top-[32px] cursor-default"
    >
      <Select :model-value="lang" @update:model-value="handleUpdateLang">
        <SelectTrigger
          class="h-8! min-w-36 bg-transparent! focus-visible:outline-none focus-visible:ring-transparent"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="lang in languages" :value="lang">
            {{ lang }}
          </SelectItem>
        </SelectContent>
      </Select>

      <!-- 代码块复制按钮 -->
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            class="size-8 bg-transparent! hover:bg-transparent!"
            @click="handleCopyCode"
          >
            <Copy />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {{ $t("codeblock.copyCode") }}
        </TooltipContent>
      </Tooltip>
    </div>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { NodeViewContent, nodeViewProps } from "@tiptap/vue-3";
import { NodeViewWrapper } from "./NodeViewWrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Copy } from "lucide-vue-next";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { languages } from "@/lib/tiptap/functionalities/highlight-codeblock";
import { updateCodeblockLang } from "@/lib/app-views/editable-outline/commands";
import { computed, ref } from "vue";
import { clipboard } from "@/lib/common/clipboard";
import { toast } from "vue-sonner";
import { useI18n } from "vue-i18n";

const props = defineProps(nodeViewProps);
const { node, editor, getPos } = props;
const lang = ref(node.attrs.lang);
const { t } = useI18n();

const blockId = computed(() => {
  const pos = getPos()!;
  const $pos = editor.state.doc.resolve(pos);
  const blockId = $pos.parent.attrs.blockId;
  return blockId;
});

const focused = computed(
  () => editor.appView.focusedBlockId.value === blockId.value
);

const handleUpdateLang = (lang_: any) => {
  if (!blockId.value) return;
  const cmd = updateCodeblockLang(editor, blockId.value, lang_);
  editor.appView.execCommand(cmd, true);
  lang.value = lang_;
};

const handleCopyCode = () => {
  const code = node.textContent;
  clipboard.writeText(code);
  toast.success(t("codeblock.copied"));
};
</script>
