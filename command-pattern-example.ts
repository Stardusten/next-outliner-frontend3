// 命令模式设计示例

import { nanoid } from "nanoid";

// 基础类型定义
type BlockId = string;
type TempId = string;

interface BlockData {
  type: "text" | "code";
  content: string;
  folded: boolean;
}

interface DocumentState {
  blocks: Map<BlockId, BlockData>;
  tree: Map<BlockId, BlockId[]>; // parent -> children
  // 其他必要的状态...
}

// 位置引用系统
type BlockRef =
  | { type: "absolute"; blockId: BlockId }
  | { type: "temp"; tempId: TempId }
  | { type: "handle"; handle: BlockHandle };

type Position =
  | { type: "before"; target: BlockRef }
  | { type: "after"; target: BlockRef }
  | { type: "under"; target: BlockRef }
  | { type: "root" };

// 块句柄 - 用于引用事务中创建的块
class BlockHandle {
  constructor(
    private tempId: TempId,
    private builder: TransactionBuilder
  ) {}

  get ref(): BlockRef {
    return { type: "handle", handle: this };
  }

  getTempId(): TempId {
    return this.tempId;
  }
}

// 抽象命令接口
interface Command {
  type: string;
  tempId?: TempId;
  execute(ctx: TransactionContext): Promise<CommandResult>;
}

interface CommandResult {
  blockId?: BlockId;
  affectedBlocks: BlockId[];
  // 其他执行结果...
}

// 事务上下文 - 维护执行过程中的状态
class TransactionContext {
  private tempIdToBlockId = new Map<TempId, BlockId>();
  private simulatedState: DocumentState;

  constructor(private initialState: DocumentState) {
    this.simulatedState = this.cloneState(initialState);
  }

  resolveBlockRef(ref: BlockRef): BlockId {
    switch (ref.type) {
      case "absolute":
        return ref.blockId;
      case "temp":
        const resolved = this.tempIdToBlockId.get(ref.tempId);
        if (!resolved) {
          throw new Error(`Temp ID ${ref.tempId} not found`);
        }
        return resolved;
      case "handle":
        return this.resolveBlockRef({
          type: "temp",
          tempId: ref.handle.getTempId(),
        });
    }
  }

  resolvePosition(position: Position): ResolvedPosition {
    if (position.type === "root") {
      return { type: "root" };
    }

    const targetBlockId = this.resolveBlockRef(position.target);
    return {
      type: position.type,
      blockId: targetBlockId,
    };
  }

  registerTempId(tempId: TempId, blockId: BlockId) {
    this.tempIdToBlockId.set(tempId, blockId);
  }

  simulateInsert(tempId: TempId, blockId: BlockId, data: BlockData) {
    // 在模拟状态中添加新块
    this.simulatedState.blocks.set(blockId, data);
    this.registerTempId(tempId, blockId);
  }

  private cloneState(state: DocumentState): DocumentState {
    // 深拷贝状态
    return {
      blocks: new Map(state.blocks),
      tree: new Map(state.tree),
    };
  }
}

// 具体命令实现
class InsertBlockCommand implements Command {
  type = "insertBlock";

  constructor(
    public tempId: TempId,
    private data: BlockData,
    private position: Position
  ) {}

  async execute(ctx: TransactionContext): Promise<CommandResult> {
    const resolvedPosition = ctx.resolvePosition(this.position);

    // 这里实际执行 loro doc 操作
    const blockId = await this.performLoroInsert(resolvedPosition, this.data);

    // 更新上下文
    ctx.registerTempId(this.tempId, blockId);

    return {
      blockId,
      affectedBlocks: [blockId],
    };
  }

  private async performLoroInsert(
    position: ResolvedPosition,
    data: BlockData
  ): Promise<BlockId> {
    // 实际的 loro doc 操作
    return nanoid(); // 模拟返回新的 block ID
  }
}

class DeleteBlockCommand implements Command {
  type = "deleteBlock";

  constructor(private target: BlockRef) {}

  async execute(ctx: TransactionContext): Promise<CommandResult> {
    const blockId = ctx.resolveBlockRef(this.target);

    // 执行删除操作
    await this.performLoroDelete(blockId);

    return {
      affectedBlocks: [blockId],
    };
  }

  private async performLoroDelete(blockId: BlockId): Promise<void> {
    // 实际的 loro doc 删除操作
  }
}

// 事务构建器
class TransactionBuilder {
  private commands: Command[] = [];
  private metadata: TransactionMetadata = {};

  constructor(private initialState: DocumentState) {}

  insertBlock(data: BlockData, position: Position): BlockHandle {
    const tempId = nanoid();
    const command = new InsertBlockCommand(tempId, data, position);

    this.commands.push(command);

    return new BlockHandle(tempId, this);
  }

  deleteBlock(target: BlockRef): this {
    const command = new DeleteBlockCommand(target);
    this.commands.push(command);
    return this;
  }

  // 复杂操作示例：插入多个块
  insertMultipleBlocks(blocks: BlockData[], parentId: BlockId): BlockHandle[] {
    const handles: BlockHandle[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const position: Position =
        i === 0
          ? { type: "under", target: { type: "absolute", blockId: parentId } }
          : { type: "after", target: handles[i - 1].ref };

      const handle = this.insertBlock(blocks[i], position);
      handles.push(handle);
    }

    return handles;
  }

  // 设置事务元数据
  setSelection(blockId: BlockId, offset: number): this {
    this.metadata.selection = { blockId, offset };
    return this;
  }

  // 执行事务
  async execute(): Promise<TransactionResult> {
    const context = new TransactionContext(this.initialState);
    const results: CommandResult[] = [];

    for (const command of this.commands) {
      const result = await command.execute(context);
      results.push(result);
    }

    return {
      commands: this.commands,
      results,
      metadata: this.metadata,
    };
  }
}

// 支持类型
interface ResolvedPosition {
  type: "root" | "before" | "after" | "under";
  blockId?: BlockId;
}

interface TransactionMetadata {
  selection?: { blockId: BlockId; offset: number };
  // 其他元数据...
}

interface TransactionResult {
  commands: Command[];
  results: CommandResult[];
  metadata: TransactionMetadata;
}

// 使用示例
export function exampleUsage() {
  const initialState: DocumentState = {
    blocks: new Map(),
    tree: new Map(),
  };

  const builder = new TransactionBuilder(initialState);

  // 简单操作
  const handle1 = builder.insertBlock(
    { type: "text", content: "Hello", folded: false },
    { type: "root" }
  );

  const handle2 = builder.insertBlock(
    { type: "text", content: "World", folded: false },
    { type: "after", target: handle1.ref }
  );

  // 复杂操作：插入多个块
  const parentHandle = builder.insertBlock(
    { type: "text", content: "Parent", folded: false },
    { type: "root" }
  );

  const childBlocks: BlockData[] = [
    { type: "text", content: "Child 1", folded: false },
    { type: "text", content: "Child 2", folded: false },
    { type: "text", content: "Child 3", folded: false },
  ];

  const childHandles = builder.insertMultipleBlocks(
    childBlocks,
    parentHandle.getTempId()
  );

  // 设置选区并执行
  builder
    .setSelection(childHandles[0].getTempId(), 0)
    .execute()
    .then((result) => {
      console.log("Transaction completed:", result);
    });
}
