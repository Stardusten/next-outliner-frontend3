import type { Block, BlockId, BlockLoaded } from "../../blocks/types";
import type { Observable } from "../../reactivity/observable";

export interface BlockStorage {
  /** 遍历所有块，回调函数返回 false 时停止遍历 */
  forEachBlock(cb: (block: BlockLoaded) => boolean): void;
  /** 根据 ID 获取块，如果不存在则返回 null */
  getBlock(id: BlockId): BlockLoaded | null;
  /** 获取块的纯文本内容，会自动解析块引用并处理循环引用 */
  getTextContent(id: BlockId): string;
  /** 获取引用了指定块的所有块的 ID 集合（反向引用） */
  getInRefs(id: BlockId): Observable<Set<BlockId>>;
  /** 获取所有根块（parentId 为 null 的块），按 fractionalIndex 排序 */
  getRootBlocks(): BlockLoaded[];
  /** 导出所有块数据为 JSONL 格式并下载 */
  export(): void;
  /** 从 JSONL 格式的内容导入块数据 */
  import(content: string, options?: ImportOptions): Promise<ImportResult>;
  /** 预检查导入数据，返回验证结果和冲突信息 */
  preCheckImport(content: string): Promise<PreCheckImportResult>;
  /** 清空所有块数据 */
  clear(reason?: string): void;
  /** 创建块事务 */
  createTransaction(): BlockTransaction;
  /** 添加事件监听器，监听块的增删改事件 */
  addEventListener(listener: BlockStorageEventListener): void;
  /** 移除事件监听器 */
  removeEventListener(listener: BlockStorageEventListener): void;
}

export type BlockTransaction = {
  /** 事务ID */
  txId: string;
  /** 事务包含的所有块操作 */
  ops: BlockOp[];
  /** 事务来源 */
  source: UpdateSource;
  /** 事务元数据，包括事务执行后期望的选区等 */
  metadata: BlockTransactionMetadata;
  /** 添加块，这只会往 ops 中添加一个块操作，不会提交事务 */
  addBlock(params: AddBlockParams): BlockTransaction;
  /** 更新块，这只会往 ops 中添加一个块操作，不会提交事务 */
  updateBlock(params: UpdateBlockParams): BlockTransaction;
  /** 删除块，这只会往 ops 中添加一个块操作，不会提交事务 */
  deleteBlock(blockId: BlockId): BlockTransaction;
  /** 缩进块，这只会往 ops 中添加一个块操作，不会提交事务 */
  demoteBlock(blockId: BlockId): BlockTransaction;
  /** 反缩进块，这只会往 ops 中添加块操作，不会提交事务 */
  promoteBlock(blockId: BlockId): BlockTransaction;
  /** 在指定块后面插入多个块，这只会往 ops 中添加块操作，不会提交事务 */
  insertAfterWithChildren(
    targetBlockId: BlockId,
    allBlocks: Block[]
  ): BlockTransaction;
  /** 提交事务，会执行所有块操作，并返回事务结果 */
  commit(): BlockTransactionResult;
};

/**
 * 一个块事务的执行结果
 */
export type BlockTransactionResult = {
  txId: string;
  ops: FinishedBlockOp[];
  source: UpdateSource;
  metadata: BlockTransactionMetadata;
};

/**
 * 块存储事件
 */
export type BlockStorageEvent = {
  type: "tx-committed";
  result: BlockTransactionResult;
};

export type BlockStorageEventBatch = BlockStorageEvent[];

export type BlockStorageEventListener = (
  events: BlockStorageEventBatch
) => void;

export type BlockOp =
  | { type: "add"; params: AddBlockParams }
  | { type: "update"; params: UpdateBlockParams }
  | { type: "delete"; blockId: BlockId };

/**
 * 一个执行完成的块操作，相比 BlockOp 多了一些执行完才知道的信息
 */
export type FinishedBlockOp =
  | { type: "add"; block: BlockLoaded }
  | { type: "update"; newBlock: BlockLoaded; oldBlock: BlockLoaded }
  | { type: "delete"; deletedBlock: BlockLoaded };

export type AddBlockParams = Block;
export type UpdateBlockParams = { id: BlockId } & Partial<
  Omit<Block, "id" | "type">
>;

/**
 * 块事务的元数据，包括事务执行后期望的选区等
 */
export type BlockTransactionMetadata = {
  /** 事务执行前选区 */
  beforeSelection?: SelectionMetadata;
  /** 事务执行后选区 */
  selection?: SelectionMetadata;
};

/**
 * 选区信息，块 + 相对块开头的偏移
 */
export type SelectionMetadata = {
  blockId: BlockId;
  anchor: number;
  head?: number;
};

export type UpdateSource = string;

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

export type PreCheckImportResult = {
  valid: boolean;
  errors: string[];
  conflictingIds: string[];
};
