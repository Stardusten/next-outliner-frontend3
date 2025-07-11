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
          <Select >
            <SelectTrigger>
              <SelectValue :placeholder="$t('quickadd.selectPlaceholder')" />
            </SelectTrigger>
            <SelectContent></SelectContent>
          </Select>
          <div class="flex gap-2">
            <Button variant="outline" @click="handleCancel">{{ $t("quickadd.cancel") }}</Button>
            <Button @click="handleSave">{{ $t("quickadd.save") }}</Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import type { App } from '@/lib/app/app';
import { getEditorFromApp } from '@/lib/app/editors';
import { editorUtils, type Editor } from '@/lib/editor/editor';
import { withTx } from '@/lib/app/tx';
import { oldSerialize, serialize } from '@/lib/editor/utils';
import { outlinerSchema } from '@/lib/editor/schema';
import type { BlockId } from '@/lib/common/types';
import { Select, SelectContent, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { toast } from 'vue-sonner';

const { app } = defineProps<{
  app: App;
}>();

const open = ref(false);
const wrapper = ref<HTMLElement | null>(null);
let editor: Editor | null = null;
let closeBySave = false; // 是否通过保存按钮关闭

async function deleteCreatedBlock() {
  if (editor) {
    const blockToDelete = editor.rootBlockIds[0];
    await withTx(app, (tx) => {
      tx.deleteBlock(blockToDelete);
    });
    editorUtils.unmount(editor);
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
    console.log("open quickadd")
    if (!wrapper.value) {
      console.error("Wrapper not found, cannot mount editor");
      return;
    }
    editor = getEditorFromApp(app, { id: "quickAdd", enlargeRootBlock: false });
    let newBlockTmpId: BlockId | null = null;
    const { idMapping } = await withTx(app, (tx) => {
      // 根块底部创建一个新块
      const index = tx.getChildrenIds(null).length;
      const newContent = oldSerialize(
        outlinerSchema.nodes.paragraph.create()
      );
      newBlockTmpId = tx.createBlockUnder(null, index, {
        type: "text",
        folded: false,
        content: newContent,
      });
    });
    const newBlockId = idMapping[newBlockTmpId!];
    editorUtils.setRootBlockIds(editor, [newBlockId]);
    editorUtils.mount(editor, wrapper.value)
    
    // 聚焦到新块
    setTimeout(() => {
      editor && editorUtils.focusEditor(editor);
    });
  } else {
    if (closeBySave) {
      // TODO 
      toast.success("快速添加中的内容成功保存至根块")
      closeBySave = false;
    } else {
      deleteCreatedBlock();
      open.value = false;
    }
  }
});
</script>