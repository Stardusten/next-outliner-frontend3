import type { App } from "@/lib/app/app";
import { BLOCKS_TREE_NAME } from "@/lib/persistence/local-storage";
import type { BlockDataInner, BlockNode, BlockType } from "@/lib/common/types";
import { outlinerSchema } from "@/lib/editor/schema";
import { LoroDoc } from "loro-crdt";
import { nanoid } from "nanoid";
import { Fragment, type Node } from "prosemirror-model";
import { ref, shallowRef } from "vue";
import { toast } from "./useToast";
import { tx } from "@/lib/app/tx";
import { forceSave } from "@/lib/app/saver";

type Block = {
  id: string;
  type: "text" | "code";
  folded: boolean;
  parentId: string;
  fractionalIndex: number;
  content: string;
  children: Block[];
};

export const EXPORT_FORMATS = ".jsonl,.bsnapshot,.snapshot";

type ExportFormat = "jsonl" | "bsnapshot" | "snapshot";

type PendingImport =
  | {
      format: "bsnapshot";
      doc: LoroDoc;
    }
  | {
      format: "snapshot";
      doc: LoroDoc;
    }
  | {
      format: "jsonl";
      blocks: Map<string, Block>;
    };

function jsonToUint8Array(obj: Record<string, number>): Uint8Array {
  // 找到最大下标，决定数组长度
  const maxIndex = Math.max(...Object.keys(obj).map(Number));
  const arr = new Uint8Array(maxIndex + 1);

  for (const [k, v] of Object.entries(obj)) {
    arr[Number(k)] = Number(v); // 写入对应位置
  }
  return arr;
}

// Uint8Array -> Base64 字符串
function uint8ToBase64(u8: Uint8Array): string {
  // 分块处理大数组，避免栈溢出
  const CHUNK_SIZE = 8192; // 8KB chunks
  let binary = "";

  for (let i = 0; i < u8.length; i += CHUNK_SIZE) {
    const chunk = u8.slice(i, i + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

// Base64 字符串 -> Uint8Array
function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  return u8;
}

const importDialogVisible = ref(false);
const importBlockCount = ref(0);
const pendingImport = shallowRef<PendingImport | null>(null);
const clearStorageDialogVisible = ref(false);
const clearHistoryDialogVisible = ref(false);

export function useImportExport(app: App) {
  // 导出功能
  const handleExport = (format: ExportFormat = "bsnapshot") => {
    if (format == "snapshot") {
      const snapshot = app.doc.export({ mode: "snapshot" });
      const base64snapshot = uint8ToBase64(snapshot);
      const a = document.createElement("a");
      a.href = `data:application/json;base64,${base64snapshot}`;
      a.download = `${app.docId}_${new Date().toLocaleString()}.snapshot`;
      a.click();
      a.remove();
    } else if (format === "bsnapshot") {
      const snapshot = app.doc.export({ mode: "snapshot" });
      const blob = new Blob([snapshot], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${app.docId}_${new Date().toLocaleString()}.bsnapshot`;
      a.click();
      a.remove();
    }
  };

  // 导入功能
  const handleImport = async (file: File) => {
    try {
      if (file.name.endsWith(".jsonl")) {
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
        pendingImport.value = {
          format: "jsonl",
          blocks: blockMap,
        };
      } else if (file.name.endsWith(".snapshot")) {
        const bytesBase64 = await file.text();
        const bytes = base64ToUint8(bytesBase64);
        const doc = new LoroDoc();
        doc.import(bytes);
        importBlockCount.value =
          doc.getTree(BLOCKS_TREE_NAME)?.getNodes({ withDeleted: false })
            ?.length ?? 0;
        importDialogVisible.value = true;
        pendingImport.value = {
          format: "snapshot",
          doc,
        };
      } else if (file.name.endsWith(".bsnapshot")) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const doc = new LoroDoc();
        doc.import(bytes);
        importBlockCount.value =
          doc.getTree(BLOCKS_TREE_NAME)?.getNodes({ withDeleted: false })
            ?.length ?? 0;
        importDialogVisible.value = true;
        pendingImport.value = {
          format: "bsnapshot",
          doc,
        };
      }
    } catch (error) {
      toast.error(`导入失败：${error}`);
    }
  };

  const applyIdMapping = (
    type: BlockType,
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
    if (!pendingImport.value) return;

    try {
      if (pendingImport.value.format === "jsonl") {
        const blockMap = pendingImport.value.blocks;

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

        const idMapping = new Map<string, string>();
        const blockNodes: [Block, BlockNode][] = [];
        tx(
          app,
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
        forceSave(app);
      } else if (
        pendingImport.value.format === "snapshot" ||
        pendingImport.value.format === "bsnapshot"
      ) {
        const importedDoc = pendingImport.value.doc;
        tx(
          app,
          (tx) => {
            const idMapping = new Map<string, string>();
            const blockNodes: [BlockNode, BlockNode][] = [];
            const createTree = (node1: BlockNode, node2: BlockNode) => {
              const node1children = node1.children() ?? [];
              for (let i = 0; i < node1children.length; i++) {
                const child = node1children[i];
                const childNode = tx.insertBlockUnder(
                  node2,
                  (dataMap) => {},
                  i
                );
                idMapping.set(child.id, childNode.id);
                blockNodes.push([child, childNode]);
                createTree(child, childNode);
              }
            };

            const importedTree = importedDoc.getTree(BLOCKS_TREE_NAME);
            const importedRoots = importedTree.roots();
            for (let i = 0; i < importedRoots.length; i++) {
              const root1 = importedRoots[i];
              const root2 = tx.insertBlockUnder(null, (dataMap) => {}, i);
              idMapping.set(root1.id, root2.id);
              blockNodes.push([root1, root2]);
              createTree(root1, root2);
            }

            for (const [node1, node2] of blockNodes) {
              const data = node1.data.toJSON() as BlockDataInner;
              node2.data.set("type", data.type);
              node2.data.set("folded", data.folded);
              node2.data.set(
                "content",
                applyIdMapping(data.type, data.content, idMapping)
              );
            }
          },
          {
            type: "localImport",
            txId: nanoid(),
          }
        );
      }
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
    pendingImport.value = null;
  };

  // 清空存储功能
  const handleClearStorage = () => {
    clearStorageDialogVisible.value = true;
  };

  // 确认清空存储
  const handleClearStorageConfirm = () => {
    try {
      app.persistence.clear();
      forceSave(app);
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

  // 新增：清空历史版本功能
  const handleClearHistory = () => {
    clearHistoryDialogVisible.value = true;
  };

  // 新增：确认清空历史版本
  const handleClearHistoryConfirm = () => {
    try {
      app.persistence.clearHistory(app.docId);
      app.updatesCount = 0;
      toast.success("已清空历史版本！");
    } catch (error) {
      console.error("清空历史版本失败:", error);
      toast.error("清空历史版本失败，请查看控制台了解详情");
    } finally {
      clearHistoryDialogVisible.value = false;
    }
  };

  // 新增：取消清空历史版本
  const handleClearHistoryCancel = () => {
    clearHistoryDialogVisible.value = false;
  };

  return {
    // 状态
    importDialogVisible,
    importBlockCount,
    clearStorageDialogVisible,
    // 新增
    clearHistoryDialogVisible,

    // 方法
    handleExport,
    handleImport,
    handleImportConfirm,
    handleImportCancel,
    handleClearStorage,
    handleClearStorageConfirm,
    handleClearStorageCancel,
    // 新增
    handleClearHistory,
    handleClearHistoryConfirm,
    handleClearHistoryCancel,
  };
}
