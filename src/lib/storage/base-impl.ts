import type { Block, BlockId, BlockLoaded } from "../blocks/types";
import { sortChildren, toBlock } from "../blocks/utils";
import { Observable } from "../reactivity/observable";
import type {
  BlockStorage,
  BlockStorageEvent,
  BlockStorageEventListener,
  AddBlockParams,
  UpdateBlockParams,
  UpdateSource,
  EventMetadata,
  ImportOptions,
  ImportResult,
  ImportPrecheck,
} from "./interface";

/**
 * 触发浏览器下载文件
 * @param content 文件内容
 * @param filename 文件名
 * @param mimeType MIME 类型
 */
function downloadFile(content: string, filename: string, mimeType: string = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 生成新的块ID
 */
function generateNewBlockId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * 验证块数据格式
 */
function isValidBlock(obj: any): obj is Block {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    (obj.type === "text" || obj.type === "code") &&
    (obj.parentId === null || typeof obj.parentId === "string") &&
    typeof obj.fractionalIndex === "number" &&
    typeof obj.content === "string" &&
    typeof obj.textContent === "string" &&
    typeof obj.folded === "boolean"
  );
}

export class BaseBlockStorage implements BlockStorage {
  protected blocks: Map<BlockId, BlockLoaded>;
  private listeners: BlockStorageEventListener[] = [];

  constructor(initBlocks: Block[] = []) {
    this.blocks = new Map();

    for (const block of initBlocks) {
      this.blocks.set(
        block.id,
        new Observable<any>({
          ...block,
          parentBlock: null,
          childrenBlocks: [],
        }),
      );
    }

    for (const blockLoaded of this.blocks.values()) {
      const blockData = blockLoaded.get();
      if (blockData.parentId) {
        const parentBlock = this.blocks.get(blockData.parentId);
        if (parentBlock) {
          blockLoaded.update((val) => (val.parentBlock = parentBlock));
          parentBlock.update((val) => val.childrenBlocks.push(blockLoaded));
        }
      }
    }

    for (const blockLoaded of this.blocks.values()) {
      sortChildren(blockLoaded);
    }
  }
  async preCheckImport(content: string): Promise<ImportPrecheck> {
    const result: ImportPrecheck = {
      valid: false,
      totalBlocks: 0,
      conflictingIds: [],
      errors: [],
    };

    try {
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.trim());
      const validBlocks: Block[] = [];
      const seenIds = new Set<string>();

      // 解析和验证所有块
      for (const [index, line] of lines.entries()) {
        try {
          const blockData = JSON.parse(line);

          if (!isValidBlock(blockData)) {
            result.errors.push(`行 ${index + 1}: 无效的块数据格式`);
            continue;
          }

          // 检查重复ID
          if (seenIds.has(blockData.id)) {
            result.errors.push(`行 ${index + 1}: 重复的块ID ${blockData.id}`);
            continue;
          }
          seenIds.add(blockData.id);

          // 检查是否与现有数据冲突
          if (this.getBlock(blockData.id)) {
            result.conflictingIds.push(blockData.id);
          }

          validBlocks.push(blockData);
        } catch (error) {
          result.errors.push(`行 ${index + 1}: JSON解析错误 - ${error}`);
        }
      }

      // 验证父子关系
      const validIds = new Set(validBlocks.map((b) => b.id));
      for (const block of validBlocks) {
        if (block.parentId) {
          const parentExists =
            this.getBlock(block.parentId) !== null || validIds.has(block.parentId);
          if (!parentExists) {
            result.errors.push(`块 ${block.id} 的父块 ${block.parentId} 不存在`);
          }
        }
      }

      result.totalBlocks = validBlocks.length;
      result.valid = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(`预检查失败: ${error}`);
      return result;
    }
  }
  async import(content: string, options?: ImportOptions): Promise<ImportResult> {
    const defaultOptions: ImportOptions = {
      conflictResolution: "skip",
      clearExisting: false,
      ...options,
    };

    const result: ImportResult = {
      success: false,
      message: "",
      imported: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // 如果需要，先清空现有数据
      if (defaultOptions.clearExisting) {
        this.clear("import");
      }

      // 解析导入内容
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.trim());
      const blocksToImport: Block[] = [];
      const idMapping = new Map<string, string>(); // 旧ID -> 新ID的映射

      // 第一阶段：解析和验证所有块
      for (const [index, line] of lines.entries()) {
        try {
          const blockData = JSON.parse(line);

          if (!isValidBlock(blockData)) {
            result.errors.push(`行 ${index + 1}: 无效的块数据格式`);
            continue;
          }

          const existingBlock = this.getBlock(blockData.id);
          let finalBlock = { ...blockData };

          // 处理ID冲突
          if (existingBlock) {
            switch (defaultOptions.conflictResolution) {
              case "skip":
                result.skipped++;
                continue;
              case "overwrite":
                // 保持原ID，稍后覆盖
                break;
              case "generateNewId":
                const newId = generateNewBlockId();
                idMapping.set(blockData.id, newId);
                finalBlock.id = newId;
                break;
            }
          }

          blocksToImport.push(finalBlock);
        } catch (error) {
          result.errors.push(`行 ${index + 1}: JSON解析错误 - ${error}`);
        }
      }

      // 第二阶段：更新所有ID引用（如果使用了新ID）
      if (idMapping.size > 0) {
        // 更新 parentId 引用
        for (const block of blocksToImport) {
          if (block.parentId && idMapping.has(block.parentId)) {
            block.parentId = idMapping.get(block.parentId)!;
          }
        }

        // 还需要检查现有数据中是否有引用被重新映射的ID
        // 这对于部分导入场景很重要
        this.forEachBlock((existingBlock) => {
          const blockData = existingBlock.get();
          if (blockData.parentId && idMapping.has(blockData.parentId)) {
            // 现有块引用了一个被重新映射的ID，需要更新引用
            this.updateBlock(
              blockData.id,
              { parentId: idMapping.get(blockData.parentId)! },
              "import-reference-update",
            );
          }
          return true;
        });
      }

      // 第三阶段：验证父子关系
      const importedIds = new Set(blocksToImport.map((b) => b.id));
      for (const block of blocksToImport) {
        if (block.parentId) {
          // 检查父块是否存在（在现有数据或即将导入的数据中）
          const parentExists =
            this.getBlock(block.parentId) !== null || importedIds.has(block.parentId);
          if (!parentExists) {
            result.errors.push(`块 ${block.id} 的父块 ${block.parentId} 不存在`);
          }
        }
      }

      // 如果有错误且不是覆盖模式，停止导入
      if (result.errors.length > 0 && defaultOptions.conflictResolution !== "overwrite") {
        result.message = `导入失败：发现 ${result.errors.length} 个错误`;
        return result;
      }

      // 第四阶段：执行导入
      for (const block of blocksToImport) {
        try {
          const existingBlock = this.getBlock(block.id);
          if (existingBlock && defaultOptions.conflictResolution === "overwrite") {
            // 更新现有块（注意：type字段不能更新，只能更新其他字段）
            this.updateBlock(
              block.id,
              {
                parentId: block.parentId,
                fractionalIndex: block.fractionalIndex,
                content: block.content,
                textContent: block.textContent,
                folded: block.folded,
              },
              "import",
            );
          } else {
            // 添加新块
            this.addBlock(block, "import");
          }
          result.imported++;
        } catch (error) {
          result.errors.push(`导入块 ${block.id} 时出错: ${error}`);
        }
      }

      result.success = result.errors.length === 0;
      result.message = result.success
        ? `成功导入 ${result.imported} 个块${result.skipped > 0 ? `，跳过 ${result.skipped} 个` : ""}`
        : `导入完成，但有错误：${result.errors.length} 个错误`;

      return result;
    } catch (error) {
      result.message = `导入失败: ${error}`;
      result.errors.push(String(error));
      return result;
    }
  }

  private emit(event: BlockStorageEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  forEachBlock(cb: (block: BlockLoaded) => boolean): void {
    for (const block of this.blocks.values()) {
      if (!cb(block)) break;
    }
  }

  getBlock(id: BlockId): BlockLoaded | null {
    return this.blocks.get(id) || null;
  }

  addBlock(params: AddBlockParams, source?: UpdateSource, metadata?: EventMetadata): void {
    if (this.blocks.has(params.id)) {
      console.warn(`ID 为 ${params.id} 的块已存在。`);
      return;
    }

    const newBlockLoaded = new Observable<any>({
      ...params,
      parentBlock: null,
      childrenBlocks: [],
    });

    this.blocks.set(params.id, newBlockLoaded);

    if (params.parentId) {
      const parent = this.blocks.get(params.parentId);
      if (parent) {
        newBlockLoaded.update((val) => (val.parentBlock = parent));
        parent.update((val) => val.childrenBlocks.push(newBlockLoaded));
        sortChildren(parent);
      }
    }

    this.emit({ type: "block-added", newBlock: newBlockLoaded, source, metadata });
  }

  updateBlock(
    id: BlockId,
    params: UpdateBlockParams,
    source?: UpdateSource,
    metadata?: EventMetadata,
  ): void {
    const blockToUpdate = this.blocks.get(id);
    if (!blockToUpdate) return;

    const oldBlockSnapshot = new Observable({ ...blockToUpdate.get() });
    const oldParentId = blockToUpdate.get().parentId;
    const oldParent = blockToUpdate.get().parentBlock;

    const hasParentChanged = params.parentId !== undefined && params.parentId !== oldParentId;

    blockToUpdate.update((val) => Object.assign(val, params));

    if (hasParentChanged) {
      if (oldParent) {
        oldParent.update((val) => {
          const index = val.childrenBlocks.findIndex((b) => b.get().id === id);
          if (index > -1) val.childrenBlocks.splice(index, 1);
        });
      }

      const newParent = params.parentId ? this.blocks.get(params.parentId) : null;
      if (newParent) {
        newParent.update((val) => {
          if (!val.childrenBlocks.some((b) => b.get().id === id)) {
            val.childrenBlocks.push(blockToUpdate);
          }
        });
        sortChildren(newParent);
      }
      blockToUpdate.update((val) => (val.parentBlock = newParent ?? null));
    } else {
      if (params.fractionalIndex !== undefined) {
        const parent = blockToUpdate.get().parentBlock;
        if (parent) {
          sortChildren(parent);
        }
      }
    }

    this.emit({
      type: "block-updated",
      oldBlock: oldBlockSnapshot,
      newBlock: blockToUpdate,
      source,
      metadata,
    });
  }

  deleteBlock(id: BlockId, source?: UpdateSource, metadata?: EventMetadata): void {
    const blockToDelete = this.blocks.get(id);
    if (!blockToDelete) return;

    const childrenCopy = [...blockToDelete.get().childrenBlocks];
    for (const child of childrenCopy) {
      this.deleteBlock(child.get().id, source, metadata);
    }

    const parent = blockToDelete.get().parentBlock;
    parent?.update((val) => {
      const index = val.childrenBlocks.findIndex((b) => b.get().id === id);
      if (index > -1) val.childrenBlocks.splice(index, 1);
    });

    this.blocks.delete(id);
    this.emit({ type: "block-deleted", deleted: blockToDelete, source, metadata });
  }

  clear(source?: UpdateSource): void {
    const allBlocks = Array.from(this.blocks.values());
    this.blocks.clear();
    for (const block of allBlocks) {
      this.emit({ type: "block-deleted", deleted: block, source });
    }
  }

  getRootBlocks(): BlockLoaded[] {
    const roots: BlockLoaded[] = [];
    for (const block of this.blocks.values()) {
      if (block.get().parentId === null) {
        roots.push(block);
      }
    }
    roots.sort((a, b) => a.get().fractionalIndex - b.get().fractionalIndex);
    return roots;
  }

  export(): void {
    const allBlocks: Block[] = [];
    for (const blockLoaded of this.blocks.values()) {
      allBlocks.push(toBlock(blockLoaded));
    }
    allBlocks.sort((a, b) => a.fractionalIndex - b.fractionalIndex);
    const jsonlContent = allBlocks.map((block) => JSON.stringify(block)).join("\n");

    // 生成文件名（包含时间戳）
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const filename = `blocks-export-${timestamp}.jsonl`;

    // 下载
    downloadFile(jsonlContent, filename, "application/jsonl");
  }

  addEventListener(listener: BlockStorageEventListener): void {
    this.listeners.push(listener);
  }

  removeEventListener(listener: BlockStorageEventListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  demoteBlock(id: BlockId, source?: UpdateSource, metadata?: EventMetadata): void {
    const blockToDemote = this.blocks.get(id);
    if (!blockToDemote) return;

    const parent = blockToDemote.get().parentBlock;
    const siblings = parent ? parent.get().childrenBlocks : this.getRootBlocks();
    const currentIndex = siblings.findIndex((b) => b.get().id === id);

    if (currentIndex < 1) {
      return;
    }

    const newParent = siblings[currentIndex - 1];
    const newSiblings = newParent.get().childrenBlocks;

    const lastChildIndex =
      newSiblings.length > 0 ? newSiblings[newSiblings.length - 1].get().fractionalIndex : 0;
    const newFractionalIndex = lastChildIndex + 1;

    this.updateBlock(
      id,
      {
        parentId: newParent.get().id,
        fractionalIndex: newFractionalIndex,
      },
      source,
      metadata,
    );
  }

  promoteBlock(id: BlockId, source?: UpdateSource, metadata?: EventMetadata): void {
    const blockToPromote = this.blocks.get(id);
    if (!blockToPromote) return;

    const parent = blockToPromote.get().parentBlock;
    if (!parent) return;

    const grandParent = parent.get().parentBlock;

    const grandParentChildren = grandParent
      ? grandParent.get().childrenBlocks
      : this.getRootBlocks();
    const parentIndexInGrandParent = grandParentChildren.findIndex(
      (b) => b.get().id === parent.get().id,
    );

    const parentFractionalIndex = parent.get().fractionalIndex;
    const nextParentSibling =
      parentIndexInGrandParent > -1 && parentIndexInGrandParent < grandParentChildren.length - 1
        ? grandParentChildren[parentIndexInGrandParent + 1]
        : null;
    const nextParentSiblingFractionalIndex = nextParentSibling
      ? nextParentSibling.get().fractionalIndex
      : parentFractionalIndex + 2;
    const newFractionalIndex = (parentFractionalIndex + nextParentSiblingFractionalIndex) / 2;

    this.updateBlock(
      id,
      {
        parentId: grandParent ? grandParent.get().id : null,
        fractionalIndex: newFractionalIndex,
      },
      source,
      metadata,
    );
  }
}
