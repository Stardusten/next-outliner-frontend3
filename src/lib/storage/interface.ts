import type { Block, BlockId, BlockLoaded } from "../blocks/types";

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

export type BlockStorageEventListener = (event: BlockStorageEvent) => void;

// 块存储接口
export interface BlockStorage {
  forEachBlock(cb: (block: BlockLoaded) => boolean): void;
  getBlock(id: BlockId): BlockLoaded | null;
  addBlock(params: AddBlockParams, source?: UpdateSource, metadata?: EventMetadata): void;
  updateBlock(
    id: BlockId,
    params: UpdateBlockParams,
    source?: UpdateSource,
    metadata?: EventMetadata,
  ): void;
  deleteBlock(id: BlockId, source?: UpdateSource, metadata?: EventMetadata): void;
  demoteBlock(id: BlockId, source?: UpdateSource, metadata?: EventMetadata): void;
  promoteBlock(id: BlockId, source?: UpdateSource, metadata?: EventMetadata): void;
  clear(source?: UpdateSource): void;
  getRootBlocks(): BlockLoaded[];
  export(): void;
  import(content: string, options?: ImportOptions): Promise<ImportResult>;
  preCheckImport(content: string): Promise<ImportPrecheck>;
  // 事件系统
  addEventListener(listener: BlockStorageEventListener): void;
  removeEventListener(listener: BlockStorageEventListener): void;
}
