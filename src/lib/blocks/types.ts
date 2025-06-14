import type { Observable } from "../reactivity/observable";

export type BlockId = string;

export type Block = {
  id: BlockId;
  type: "text" | "code";
  parentId: BlockId | null;
  fractionalIndex: number;
  content: string;
  textContent: string;
  folded: boolean;
};

export type BlockLoaded = Observable<
  Block & {
    parentBlock: BlockLoaded | null;
    childrenBlocks: BlockLoaded[];
  }
>;
