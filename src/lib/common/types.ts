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
  blockId: BlockId;
  anchor: number;
  head?: number;
  scrollIntoView?: boolean;
};

export type TxOriginExtraInfo = {
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
) &
  TxOriginExtraInfo;
