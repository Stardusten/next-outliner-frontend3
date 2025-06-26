import { outlinerSchema } from "@/lib/editor/schema";
import { nanoid } from "nanoid";
import { Fragment, type Node } from "prosemirror-model";
import { ref } from "vue";
import { toast } from "./useToast";
import type { App } from "@/lib/app/app";
import type { BlockNode } from "@/lib/common/types";

type Block = {
  id: string;
  type: "text" | "code";
  folded: boolean;
  parentId: string;
  fractionalIndex: number;
  content: string;
  children: Block[];
};

export function useImportExport(getApp: () => App) {
  // 导入功能状态
  const importDialogVisible = ref(false);
  const importBlockCount = ref(0);
  let pendingImportFile: File | null = null;

  // 清空存储确认状态
  const clearStorageDialogVisible = ref(false);

  // 导出功能
  const handleExport = () => {
    const app = getApp();
    const snapshot = app.exportShallowSnapshot();
    const base64snapshot = btoa(JSON.stringify(snapshot));
    const a = document.createElement("a");
    a.href = `data:application/json;base64,${base64snapshot}`;
    a.download = `${app.docId}_${new Date().toISOString()}.snapshot`;
    a.click();
    a.remove();
  };

  // 导入功能
  const handleImport = async (file: File) => {
    try {
      const content = await file.text();
      const lines = content.split("\n");

      const blockMap = new Map<string, Block>();
      for (const line of lines) {
        const block = JSON.parse(line) as Block;
        block.children = [];
        blockMap.set(block.id, block);
      }

      importBlockCount.value = blockMap.size;
      importDialogVisible.value = true;
      pendingImportFile = file;
    } catch (error) {
      toast.error(`导入失败：${error}`);
    }
  };

  const applyIdMapping = (
    type: "text" | "code",
    content: string,
    mapping: Map<string, string>
  ) => {
    const nodeJson = JSON.parse(content);
    const node = outlinerSchema.nodeFromJSON(nodeJson);
    const blockRefType = outlinerSchema.nodes.blockRef;
    const paragraphType = outlinerSchema.nodes.paragraph;
    const codeblockType = outlinerSchema.nodes.codeblock;

    const recur = (fragment: Fragment) => {
      const result: Node[] = [];

      fragment.forEach((child) => {
        if (child.type === blockRefType) {
          const oldId = child.attrs.blockId;
          const newId = mapping.get(oldId) ?? oldId;
          const newNode = blockRefType.create({ blockId: newId });
          result.push(newNode);
        } else {
          result.push(child.copy(recur(child.content)));
        }
      });

      return Fragment.fromArray(result);
    };

    if (type == "text") {
      const paragraph = paragraphType.create({}, recur(node.content));
      return JSON.stringify(paragraph.toJSON());
    } else if (type == "code") {
      const codeblock = codeblockType.create({}, recur(node.content));
      return JSON.stringify(codeblock.toJSON());
    } else throw new Error("不支持的块类型");
  };

  // 处理导入确认
  const handleImportConfirm = async () => {
    if (!pendingImportFile) return;

    try {
      const content = await pendingImportFile.text();
      const lines = content.split("\n");

      const blockMap = new Map<string, Block>();
      for (const line of lines) {
        const block = JSON.parse(line) as Block;
        block.children = [];
        blockMap.set(block.id, block);
      }

      for (const block of blockMap.values()) {
        if (block.parentId == null) continue; // 根块
        const parentBlock = blockMap.get(block.parentId);
        if (!parentBlock) {
          throw new Error(`父块 ${block.parentId} 不存在`);
        }
        parentBlock.children.push(block);
      }

      for (const block of blockMap.values()) {
        block.children.sort((a, b) => a.fractionalIndex - b.fractionalIndex);
      }

      const blockStorage = getApp();
      const idMapping = new Map<string, string>();
      const blockNodes: [Block, BlockNode][] = [];
      blockStorage.tx(
        (tx) => {
          const createTree = (block: Block, node: BlockNode) => {
            for (let i = 0; i < block.children.length; i++) {
              const child = block.children[i];
              const childNode = tx.insertBlockUnder(node, (dataMap) => {}, i);
              idMapping.set(child.id, childNode.id);
              blockNodes.push([child, childNode]);
              createTree(child, childNode);
            }
          };

          [...blockMap.values()]
            .filter((block) => block.parentId == null)
            .sort((a, b) => a.fractionalIndex - b.fractionalIndex)
            .forEach((block, i) => {
              const rootNode = tx.insertBlockUnder(null, (dataMap) => {}, i);
              idMapping.set(block.id, rootNode.id);
              blockNodes.push([block, rootNode]);
              createTree(block, rootNode);
            });

          for (const [block, blockNode] of blockNodes) {
            blockNode.data.set("type", block.type);
            blockNode.data.set("folded", block.folded);
            blockNode.data.set(
              "content",
              applyIdMapping(block.type, block.content, idMapping)
            );
          }
        },
        {
          type: "localImport",
          txId: nanoid(),
        }
      );

      toast.success("导入成功！");
      blockStorage._saver.forceSave();
    } catch (error) {
      toast.error(`导入失败：${error}`);
    } finally {
      handleImportCancel();
    }
  };

  // 处理导入取消
  const handleImportCancel = () => {
    importDialogVisible.value = false;
    importBlockCount.value = 0;
    pendingImportFile = null;
  };

  // 清空存储功能
  const handleClearStorage = () => {
    clearStorageDialogVisible.value = true;
  };

  // 确认清空存储
  const handleClearStorageConfirm = () => {
    const storage = getApp();
    try {
      storage._persistence.clear();
      storage._saver.forceSave();
      // 刷新页面以重新加载
      window.location.reload();
    } catch (error) {
      console.error("清空存储失败:", error);
      toast.error("清空存储失败，请查看控制台了解详情");
    } finally {
      clearStorageDialogVisible.value = false;
    }
  };

  // 取消清空存储
  const handleClearStorageCancel = () => {
    clearStorageDialogVisible.value = false;
  };

  return {
    // 状态
    importDialogVisible,
    importBlockCount,
    clearStorageDialogVisible,

    // 方法
    handleExport,
    handleImport,
    handleImportConfirm,
    handleImportCancel,
    handleClearStorage,
    handleClearStorageConfirm,
    handleClearStorageCancel,
  };
}
