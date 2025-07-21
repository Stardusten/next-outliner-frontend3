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
