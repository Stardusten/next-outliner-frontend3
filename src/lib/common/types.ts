import type { LoroMap, LoroTreeNode, TreeID, VersionVector } from "loro-crdt";

export type BlockId = TreeID;

export type BlockNode = LoroTreeNode;

export type BlocksVersion = VersionVector;

export type BlockType = "text" | "code";

export type BlockDataInner = {
  folded: boolean;
  type: BlockType;
  content: string;
};

export type BlockData = LoroMap<BlockDataInner>;

export type SelectionInfo = {
  editorId: string;
  blockId: BlockId;
  anchor: number;
  head?: number;
  scrollIntoView?: boolean;
};

export type TxOriginExtraInfo = {
  // 事务执行前和执行后的选区信息
  // 事务执行前：应该记录 beforeSelection，selection 是事务执行后期望的选区信息
  // 比如在块中间换行这个事务，期望的选区就应该是分割出的两个块，下面一个块的开头
  // 事务执行后，如果 selection 为空，应该补上事务执行后的选区信息
  beforeSelection?: SelectionInfo;
  selection?: SelectionInfo;
};

export type TxOrigin = (
  | {
      type: "localEditorContent";
      editorId: string;
      blockId: BlockId;
      txId: string;
    }
  | {
      type: "localEditorStructural";
      editorId?: string;
      txId: string;
    }
  | {
      type: "localImport";
      txId: string;
    }
  | {
      type: "undoRedo";
    }
) &
  TxOriginExtraInfo;
