import type { Block, BlockId, BlockLoaded } from "../blocks/types";
import type { Observable } from "../reactivity/observable";

export type UpdateSource = string;
export type AddBlockParams = Block;
export type UpdateBlockParams = Partial<Omit<Block, "id" | "type">>;

export type ImportOptions = {
  /** 当ID冲突时如何处理 */
  conflictResolution: "skip" | "overwrite" | "generateNewId";
  /** 是否清空现有数据后再导入 */
  clearExisting?: boolean;
};

export type ImportResult = {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
  errors: string[];
};

export type ImportPrecheck = {
  valid: boolean;
  totalBlocks: number;
  conflictingIds: string[];
  errors: string[];
};

export type SelectionMetadata = {
  blockId: BlockId;
  offset: number;
};

export type EventMetadata = {
  selection?: SelectionMetadata;
};

// 块存储事件
export type BlockStorageEvent =
  | {
      type: "block-added";
      newBlock: BlockLoaded;
      source?: UpdateSource;
      metadata?: EventMetadata;
    }
  | {
      type: "block-updated";
      oldBlock: BlockLoaded;
      newBlock: BlockLoaded;
      source?: UpdateSource;
      metadata?: EventMetadata;
    }
  | {
      type: "block-deleted";
      deleted: BlockLoaded;
      source?: UpdateSource;
      metadata?: EventMetadata;
    };

export type BlockStorageEventBatch = BlockStorageEvent[];

export type BlockStorageEventListener = (
  events: BlockStorageEventBatch
) => void;

// 块存储接口
export interface BlockStorage {
  /** 遍历所有块，回调函数返回 false 时停止遍历 */
  forEachBlock(cb: (block: BlockLoaded) => boolean): void;
  /** 根据 ID 获取块，如果不存在则返回 null */
  getBlock(id: BlockId): BlockLoaded | null;
  /** 获取块的纯文本内容，会自动解析块引用并处理循环引用 */
  getTextContent(id: BlockId): string;
  /** 获取引用了指定块的所有块的 ID 集合（反向引用） */
  getInRefs(id: BlockId): Observable<Set<BlockId>>;
  /** 添加单个块到存储中 */
  addBlock(
    params: AddBlockParams,
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void;
  /** 批量添加多个块，会正确处理父子关系的建立和排序 */
  addBlocks(
    blocks: Block[],
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void;
  /** 更新指定块的属性 */
  updateBlock(
    id: BlockId,
    params: UpdateBlockParams,
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void;
  /** 删除指定块及其所有子块 */
  deleteBlock(
    id: BlockId,
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void;
  /** 将块降级（缩进），成为前一个兄弟块的子块 */
  demoteBlock(
    id: BlockId,
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void;
  /** 将块升级（反缩进），提升到父块的同一层级 */
  promoteBlock(
    id: BlockId,
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void;
  /**
   * 在目标块后面插入多个块（包括根块和非根块，根块的 parentId 和 fractionalIndex
   * 可以随便设置），会自动处理根块的位置和非根块的父子关系
   */
  insertAfterWithChildren(
    targetBlockId: BlockId,
    allBlocks: Block[],
    source?: UpdateSource,
    metadata?: EventMetadata
  ): void;
  /** 清空所有块 */
  clear(source?: UpdateSource): void;
  /** 获取所有根块（parentId 为 null 的块），按 fractionalIndex 排序 */
  getRootBlocks(): BlockLoaded[];
  /** 导出所有块数据为 JSONL 格式并下载 */
  export(): void;
  /** 从 JSONL 格式的内容导入块数据 */
  import(content: string, options?: ImportOptions): Promise<ImportResult>;
  /** 预检查导入内容的有效性和冲突情况 */
  preCheckImport(content: string): Promise<ImportPrecheck>;
  // 事件系统
  /** 添加事件监听器，监听块的增删改事件 */
  addEventListener(listener: BlockStorageEventListener): void;
  /** 移除事件监听器 */
  removeEventListener(listener: BlockStorageEventListener): void;
}
