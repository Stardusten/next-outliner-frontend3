<template>
  <Dialog v-model:open="open">
    <DialogTrigger>
      <Tooltip>
        <TooltipTrigger as-child>
          <slot />
        </TooltipTrigger>
        <TooltipContent>
          {{ $t("quickadd.tooltip") }}
        </TooltipContent>
      </Tooltip>
    </DialogTrigger>

    <DialogContent>
      <DialogTitle>
        {{ $t("quickadd.title") }}
      </DialogTitle>
      <div ref="wrapper" class="outline-none my-2"></div>
      <DialogFooter as-child>
        <div class="flex justify-between w-full">
          <Select>
            <SelectTrigger>
              <SelectValue :placeholder="$t('quickadd.selectPlaceholder')" />
            </SelectTrigger>
            <SelectContent></SelectContent>
          </Select>
          <div class="flex gap-2">
            <Button variant="outline" @click="handleCancel">{{
              $t("quickadd.cancel")
            }}</Button>
            <Button @click="handleSave">{{ $t("quickadd.save") }}</Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from "vue";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import type { App } from "@/lib/app/app";
import { withTx } from "@/lib/app/tx";
import { contentNodeToStr, contentNodeToStrAndType } from "@/lib/tiptap/utils";
import type { BlockId } from "@/lib/common/types";
import { Select, SelectContent, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { toast } from "vue-sonner";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";
import { registerAppView } from "@/lib/app/views";

const { app } = defineProps<{
  app: App;
}>();

const open = ref(false);
const wrapper = ref<HTMLElement | null>(null);
let editor: EditableOutlineView | null = null;
let closeBySave = false; // 是否通过保存按钮关闭

async function deleteCreatedBlock() {
  if (editor) {
    const blockToDelete = editor.rootBlockIds[0];
    await withTx(app, (tx) => {
      tx.deleteBlock(blockToDelete);
    });
    editor.unmount();
    editor = null;
  }
}

function handleCancel() {
  deleteCreatedBlock();
  open.value = false;
}

function handleSave() {
  closeBySave = true;
  open.value = false;
}

watch(open, async (openVal) => {
  if (openVal) {
    await nextTick();
    console.log("open quickadd");
    if (!wrapper.value) {
      console.error("Wrapper not found, cannot mount editor");
      return;
    }
    editor = new EditableOutlineView(app, { id: "quickAdd" });
    let newBlockTmpId: BlockId | null = null;
    const { idMapping } = await withTx(app, (tx) => {
      // 根块底部创建一个新块
      const index = tx.getChildrenIds(null).length;
      const newContent = contentNodeToStr(
        app.detachedSchema.nodes.paragraph.create()
      );
      newBlockTmpId = tx.createBlockUnder(null, index, {
        type: "text",
        folded: false,
        content: newContent,
      });
    });
    const newBlockId = idMapping[newBlockTmpId!];
    editor.setRootBlockIds([newBlockId]);
    editor.mount(wrapper.value);
    registerAppView(app, editor);

    // 聚焦到新块
    setTimeout(() => {
      editor?.tiptap?.view.focus();
    });
  } else {
    if (closeBySave) {
      // TODO
      toast.success("快速添加中的内容成功保存至根块");
      closeBySave = false;
    } else {
      deleteCreatedBlock();
      open.value = false;
    }
  }
});

onUnmounted(() => {
  if (editor) {
    editor.unmount();
    editor = null;
  }
});
</script>
