import type { Block, BlockId, BlockLoaded } from "../blocks/types";
import { sortChildren, toBlock } from "../blocks/utils";
import { outlinerSchema } from "../editor/schema";
import { UpdateSources } from "../editor/update-source";
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
import { Node as ProseMirrorNode } from "prosemirror-model";

/**
 * 触发浏览器下载文件
 * @param content 文件内容
 * @param filename 文件名
 * @param mimeType MIME 类型
 */
function downloadFile(
  content: string,
  filename: string,
  mimeType: string = "text/plain"
) {
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
    typeof obj.folded === "boolean"
  );
}

/**
 * 从一个块的 ProseMirror 节点中获取所有块引用
 */
function getBlockRefs(node: ProseMirrorNode): BlockId[] {
  const res: BlockId[] = [];
  node.descendants((node) => {
    if (node.type === outlinerSchema.nodes.blockRef) {
      const blockId = node.attrs.blockId;
      blockId && res.push(blockId);
    }
  });
  return res;
}

export class BaseBlockStorage implements BlockStorage {
  protected blocks: Map<BlockId, BlockLoaded>;
  /**
   * 记录每个块的反链，即引用了这个块的块
   */
  private inRefs: Map<BlockId, Observable<Set<BlockId>>>;
  private listeners: BlockStorageEventListener[] = [];
  private textContentCache: Map<BlockId, string> = new Map();
  private pendingEvents: BlockStorageEvent[] = [];

  constructor(initBlocks: Block[] = []) {
    this.blocks = new Map();
    this.inRefs = new Map();

    for (const block of initBlocks) {
      // parentBlock 和 childrenBlocks 留空，下面再初始化
      this.blocks.set(
        block.id,
        new Observable<any>({
          ...block,
          parentBlock: null,
          childrenBlocks: [],
        })
      );

      // 初始化 linkings
      const nodeJson = JSON.parse(block.content);
      const node = outlinerSchema.nodeFromJSON(nodeJson);
      const refs = getBlockRefs(node);
      for (const ref of refs) this.addInRef(block.id, ref);
    }

    // 补全之前没初始化的 parentBlock 和 childrenBlocks
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

    // 根块也要记得按 fractionalIndex 排序
    for (const blockLoaded of this.blocks.values()) {
      sortChildren(blockLoaded);
    }

    // 初始化 inRefs
    setTimeout(() => {
      for (const blockLoaded of this.blocks.values()) {
        const blockData = blockLoaded.get();
        const nodeJson = JSON.parse(blockData.content);
        const node = outlinerSchema.nodeFromJSON(nodeJson);
        const refs = getBlockRefs(node);
        console.log("refs=" + refs);
        for (const ref of refs) this.addInRef(ref, blockData.id);
      }
    });
  }

  /**
   * 更新 this.inRefs，记录 b 引用了 a
   */
  private addInRef(a: BlockId, b: BlockId) {
    let set = this.inRefs.get(a);
    if (!set) {
      set = new Observable(new Set([b]));
      this.inRefs.set(a, set);
    } else {
      set.update((val) => val.add(b));
    }
  }

  /**
   * 更新 this.inRefs，删除 b 引用了 a
   */
  private removeInRef(a: BlockId, b: BlockId) {
    const set = this.inRefs.get(a);
    if (set) {
      set.update((val) => val.delete(b));
    }
  }

  /**
   * 获取块的文本内容，会解析块引用并处理循环引用。
   * 如果无法获得文本内容，则返回块ID
   */
  getTextContent(id: BlockId, visited?: Set<BlockId>): string {
    // 用于记录已访问的块，避免循环引用
    visited ??= new Set<BlockId>();
    this.loadTextContentToCache(id, visited);
    return this.textContentCache.get(id) ?? id;
  }

  private loadTextContentToCache(
    blockId: BlockId,
    visited: Set<BlockId>
  ): void {
    if (visited.has(blockId)) return;
    visited.add(blockId);

    if (this.textContentCache.has(blockId)) return;

    const block = this.getBlock(blockId);
    if (!block) return;

    const nodeJson = JSON.parse(block.get().content);
    const node = outlinerSchema.nodeFromJSON(nodeJson);

    const arr: string[] = [];
    node.content.descendants((currNode) => {
      if (currNode.isText) arr.push(currNode.text ?? "");
      else if (currNode.type === outlinerSchema.nodes.blockRef) {
        const blockId = currNode.attrs.blockId;
        const content = this.getTextContent(blockId, visited);
        arr.push(content);
      } else if (currNode.type === outlinerSchema.nodes.codeblock) {
        arr.push(currNode.textContent);
      }
    });
    const textContent = arr.join("");
    this.textContentCache.set(blockId, textContent);
  }

  /**
   * 让一个块的文本内容缓存失效，注意这同时会递归地
   * 所有引用了这个块的块的文本内容缓存失效
   */
  private invalidateTextContentCache(blockId?: BlockId): void {
    if (blockId) {
      const inRefs = this.getInRefs(blockId);
      for (const ref of inRefs.get()) {
        this.invalidateTextContentCache(ref); // 递归
      }
      this.textContentCache.delete(blockId);
    } else {
      this.textContentCache.clear();
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
            this.getBlock(block.parentId) !== null ||
            validIds.has(block.parentId);
          if (!parentExists) {
            result.errors.push(
              `块 ${block.id} 的父块 ${block.parentId} 不存在`
            );
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
  async import(
    content: string,
    options?: ImportOptions
  ): Promise<ImportResult> {
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
              UpdateSources.localImport
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
            this.getBlock(block.parentId) !== null ||
            importedIds.has(block.parentId);
          if (!parentExists) {
            result.errors.push(
              `块 ${block.id} 的父块 ${block.parentId} 不存在`
            );
          }
        }
      }

      // 如果有错误且不是覆盖模式，停止导入
      if (
        result.errors.length > 0 &&
        defaultOptions.conflictResolution !== "overwrite"
      ) {
        result.message = `导入失败：发现 ${result.errors.length} 个错误`;
        return result;
      }

      // 第四阶段：执行导入
      for (const block of blocksToImport) {
        try {
          const existingBlock = this.getBlock(block.id);
          if (
            existingBlock &&
            defaultOptions.conflictResolution === "overwrite"
          ) {
            // 更新现有块（注意：type字段不能更新，只能更新其他字段）
            this.updateBlock(
              block.id,
              {
                parentId: block.parentId,
                fractionalIndex: block.fractionalIndex,
                content: block.content,
                folded: block.folded,
              },
              UpdateSources.localImport
            );
          } else {
            // 添加新块
            this.addBlock(block, UpdateSources.localImport);
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
    this.pendingEvents.push(event);
    // 使用 setTimeout 确保在当前操作完成后发送批量事件
    setTimeout(() => this.flushEvents(), 0);
  }

  private emitBatch(events: BlockStorageEvent[]) {
    if (events.length === 0) return;
    for (const listener of this.listeners) {
      listener(events);
    }
  }

  private flushEvents() {
    if (this.pendingEvents.length === 0) return;
    const eventsToFlush = [...this.pendingEvents];
    this.pendingEvents = [];
    this.emitBatch(eventsToFlush);
  }

  forEachBlock(cb: (block: BlockLoaded) => boolean): void {
    for (const block of this.blocks.values()) {
      if (!cb(block)) break;
    }
  }

  getBlock(id: BlockId): BlockLoaded | null {
    return this.blocks.get(id) || null;
  }

  addBlock(
    params: AddBlockParams,
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void {
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

    // 更新 linkings
    const nodeJson = JSON.parse(params.content);
    const node = outlinerSchema.nodeFromJSON(nodeJson);
    const refs = getBlockRefs(node);
    for (const ref of refs) {
      this.addInRef(ref, params.id); // params.id 引用了 ref
    }

    this.emit({
      type: "block-added",
      newBlock: newBlockLoaded,
      source,
      metadata,
    });
  }

  addBlocks(
    blocks: Block[],
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void {
    if (blocks.length === 0) return;

    // 检查是否有重复ID
    const newBlockIds = new Set<string>();
    for (const block of blocks) {
      if (this.blocks.has(block.id)) {
        console.warn(`ID 为 ${block.id} 的块已存在，批量插入被取消。`);
        return;
      }
      if (newBlockIds.has(block.id)) {
        console.warn(`批量插入中存在重复ID ${block.id}，批量插入被取消。`);
        return;
      }
      newBlockIds.add(block.id);
    }

    // 第一阶段：创建所有块（不建立父子关系）
    const newBlockLoadeds = new Map<BlockId, BlockLoaded>();

    for (const block of blocks) {
      const newBlockLoaded = new Observable<any>({
        ...block,
        parentBlock: null,
        childrenBlocks: [],
      });

      this.blocks.set(block.id, newBlockLoaded);
      newBlockLoadeds.set(block.id, newBlockLoaded);

      // 更新 linkings
      const nodeJson = JSON.parse(block.content);
      const node = outlinerSchema.nodeFromJSON(nodeJson);
      const refs = getBlockRefs(node);
      for (const ref of refs) {
        this.addInRef(ref, block.id);
      }
    }

    // 第二阶段：建立所有父子关系
    for (const block of blocks) {
      if (block.parentId) {
        const childBlockLoaded = newBlockLoadeds.get(block.id)!;
        // 先尝试在新块中找父块
        let parentBlockLoaded = newBlockLoadeds.get(block.parentId);
        // 如果没找到，再在现有块中找
        if (!parentBlockLoaded) {
          parentBlockLoaded = this.blocks.get(block.parentId);
        }

        if (parentBlockLoaded) {
          childBlockLoaded.update(
            (val) => (val.parentBlock = parentBlockLoaded)
          );
          parentBlockLoaded.update((val) =>
            val.childrenBlocks.push(childBlockLoaded)
          );
        } else {
          console.warn(`块 ${block.id} 的父块 ${block.parentId} 不存在`);
        }
      }
    }

    // 第三阶段：对所有受影响的父块进行排序
    const parentsToSort = new Set<BlockLoaded>();
    for (const block of blocks) {
      if (block.parentId) {
        const parentBlockLoaded = this.blocks.get(block.parentId);
        if (parentBlockLoaded) {
          parentsToSort.add(parentBlockLoaded);
        }
      }
    }

    for (const parent of parentsToSort) {
      sortChildren(parent);
    }

    // 第四阶段：触发所有添加事件（批量发送）
    const events: BlockStorageEvent[] = [];
    for (const blockId of newBlockIds) {
      const newBlockLoaded = newBlockLoadeds.get(blockId)!;
      events.push({
        type: "block-added",
        newBlock: newBlockLoaded,
        source,
        metadata,
      });
    }
    this.emitBatch(events);
  }

  updateBlock(
    id: BlockId,
    params: UpdateBlockParams,
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void {
    const blockToUpdate = this.blocks.get(id);
    if (!blockToUpdate) return;

    const oldBlockSnapshot = new Observable({ ...blockToUpdate.get() });
    const oldParentId = blockToUpdate.get().parentId;
    const oldParent = blockToUpdate.get().parentBlock;

    const hasParentChanged =
      params.parentId !== undefined && params.parentId !== oldParentId;

    blockToUpdate.update((val) => Object.assign(val, params));

    // 如果内容发生变化，清除文本内容缓存
    // 并且更新 linkings
    if (params.content !== undefined) {
      this.invalidateTextContentCache();

      // 删除所有旧的引用
      const oldNodeJson = JSON.parse(oldBlockSnapshot.get().content);
      const oldNode = outlinerSchema.nodeFromJSON(oldNodeJson);
      const oldRefs = getBlockRefs(oldNode);
      for (const ref of oldRefs) {
        this.removeInRef(ref, id); // ref 不再引用 id
      }

      // 添加所有新的引用
      const newNodeJson = JSON.parse(blockToUpdate.get().content);
      const newNode = outlinerSchema.nodeFromJSON(newNodeJson);
      const newRefs = getBlockRefs(newNode);
      for (const ref of newRefs) {
        this.addInRef(id, ref); // ref 引用了 id
      }
    }

    if (hasParentChanged) {
      if (oldParent) {
        oldParent.update((val) => {
          const index = val.childrenBlocks.findIndex((b) => b.get().id === id);
          if (index > -1) val.childrenBlocks.splice(index, 1);
        });
      }

      const newParent = params.parentId
        ? this.blocks.get(params.parentId)
        : null;
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

  deleteBlock(
    id: BlockId,
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void {
    // 收集所有要删除的块
    const blocksToDelete = this.collectBlocksToDelete(id);

    // 批量删除和发送事件
    this.deleteBlocksBatch(blocksToDelete, source, metadata);
  }

  private collectBlocksToDelete(id: BlockId): BlockLoaded[] {
    const blocksToDelete: BlockLoaded[] = [];
    const visited = new Set<BlockId>();

    const collectRecursive = (blockId: BlockId) => {
      if (visited.has(blockId)) return;
      visited.add(blockId);

      const block = this.blocks.get(blockId);
      if (!block) return;

      // 先收集子块
      const children = [...block.get().childrenBlocks];
      for (const child of children) {
        collectRecursive(child.get().id);
      }

      // 再收集当前块
      blocksToDelete.push(block);
    };

    collectRecursive(id);
    return blocksToDelete;
  }

  private deleteBlocksBatch(
    blocksToDelete: BlockLoaded[],
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void {
    const events: BlockStorageEvent[] = [];

    for (const blockToDelete of blocksToDelete) {
      const id = blockToDelete.get().id;

      // 从父块的子块列表中移除
      const parent = blockToDelete.get().parentBlock;
      parent?.update((val) => {
        const index = val.childrenBlocks.findIndex((b) => b.get().id === id);
        if (index > -1) val.childrenBlocks.splice(index, 1);
      });

      // 从存储中删除
      this.blocks.delete(id);

      // 更新 linkings，删除所有引用
      const nodeJson = JSON.parse(blockToDelete.get().content);
      const node = outlinerSchema.nodeFromJSON(nodeJson);
      const refs = getBlockRefs(node);
      for (const ref of refs) {
        this.removeInRef(ref, id); // ref 不再引用 id
      }

      // 收集删除事件
      events.push({
        type: "block-deleted",
        deleted: blockToDelete,
        source,
        metadata,
      });
    }

    // 清除文本内容缓存
    this.invalidateTextContentCache();

    // 批量发送删除事件
    this.emitBatch(events);
  }

  clear(source?: UpdateSource): void {
    const allBlocks = Array.from(this.blocks.values());
    this.blocks.clear();
    this.invalidateTextContentCache();

    // 批量发送删除事件
    const events: BlockStorageEvent[] = allBlocks.map((block) => ({
      type: "block-deleted",
      deleted: block,
      source,
    }));
    this.emitBatch(events);
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

  getInRefs(id: BlockId): Observable<Set<BlockId>> {
    let res = this.inRefs.get(id);
    if (res) return res;
    else {
      res = new Observable(new Set());
      this.inRefs.set(id, res);
      return res;
    }
  }

  export(): void {
    const allBlocks: Block[] = [];
    for (const blockLoaded of this.blocks.values()) {
      allBlocks.push(toBlock(blockLoaded));
    }
    allBlocks.sort((a, b) => a.fractionalIndex - b.fractionalIndex);
    const jsonlContent = allBlocks
      .map((block) => JSON.stringify(block))
      .join("\n");

    // 生成文件名（包含时间戳）
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
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

  demoteBlock(
    id: BlockId,
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void {
    const blockToDemote = this.blocks.get(id);
    if (!blockToDemote) return;

    const parent = blockToDemote.get().parentBlock;
    const siblings = parent
      ? parent.get().childrenBlocks
      : this.getRootBlocks();
    const currentIndex = siblings.findIndex((b) => b.get().id === id);

    if (currentIndex < 1) {
      return;
    }

    const newParent = siblings[currentIndex - 1];
    const newSiblings = newParent.get().childrenBlocks;

    const lastChildIndex =
      newSiblings.length > 0
        ? newSiblings[newSiblings.length - 1].get().fractionalIndex
        : 0;
    const newFractionalIndex = lastChildIndex + 1;

    this.updateBlock(
      id,
      {
        parentId: newParent.get().id,
        fractionalIndex: newFractionalIndex,
      },
      source,
      metadata
    );
  }

  promoteBlock(
    id: BlockId,
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void {
    const blockToPromote = this.blocks.get(id);
    if (!blockToPromote) return;

    const parent = blockToPromote.get().parentBlock;
    if (!parent) return;

    const grandParent = parent.get().parentBlock;

    const grandParentChildren = grandParent
      ? grandParent.get().childrenBlocks
      : this.getRootBlocks();
    const parentIndexInGrandParent = grandParentChildren.findIndex(
      (b) => b.get().id === parent.get().id
    );

    const parentFractionalIndex = parent.get().fractionalIndex;
    const nextParentSibling =
      parentIndexInGrandParent > -1 &&
      parentIndexInGrandParent < grandParentChildren.length - 1
        ? grandParentChildren[parentIndexInGrandParent + 1]
        : null;
    const nextParentSiblingFractionalIndex = nextParentSibling
      ? nextParentSibling.get().fractionalIndex
      : parentFractionalIndex + 2;
    const newFractionalIndex =
      (parentFractionalIndex + nextParentSiblingFractionalIndex) / 2;

    this.updateBlock(
      id,
      {
        parentId: grandParent ? grandParent.get().id : null,
        fractionalIndex: newFractionalIndex,
      },
      source,
      metadata
    );
  }

  insertAfterWithChildren(
    targetBlockId: BlockId,
    allBlocks: Block[],
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void {
    if (allBlocks.length === 0) return;

    const targetBlock = this.blocks.get(targetBlockId);
    if (!targetBlock) return;

    // 分离根块和非根块
    const rootBlocks: Block[] = [];
    const nonRootBlocks: Block[] = [];

    for (const block of allBlocks) {
      if (block.parentId === null) {
        rootBlocks.push(block);
      } else {
        nonRootBlocks.push(block);
      }
    }

    // 1. 先插入根块到目标位置
    if (rootBlocks.length > 0) {
      const targetBlockData = targetBlock.get();
      const parentBlock = targetBlockData.parentBlock;
      const siblings = parentBlock
        ? parentBlock.get().childrenBlocks
        : this.getRootBlocks();
      const targetIndex = siblings.findIndex(
        (b) => b.get().id === targetBlockId
      );

      if (targetIndex !== -1) {
        // 计算插入位置的分数索引范围
        const targetFractionalIndex = targetBlockData.fractionalIndex;
        const nextSibling =
          targetIndex < siblings.length - 1 ? siblings[targetIndex + 1] : null;
        const nextSiblingFractionalIndex = nextSibling
          ? nextSibling.get().fractionalIndex
          : targetFractionalIndex + 2;

        // 计算每个根块的分数索引
        const gap =
          (nextSiblingFractionalIndex - targetFractionalIndex) /
          (rootBlocks.length + 1);

        // 准备根块
        const rootBlocksToInsert: Block[] = rootBlocks.map((block, index) => {
          const newFractionalIndex = targetFractionalIndex + gap * (index + 1);
          return {
            ...block,
            parentId: targetBlockData.parentId,
            fractionalIndex: newFractionalIndex,
          };
        });

        // 使用 addBlocks 插入根块
        this.addBlocks(rootBlocksToInsert, source, metadata);
      }
    }

    // 2. 然后插入非根块（此时它们的父块已经存在）
    if (nonRootBlocks.length > 0) {
      this.addBlocks(nonRootBlocks, source, metadata);
    }
  }
}
