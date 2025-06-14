import type { Block, BlockId } from "../blocks/types";
import type { BlockStorage } from "../storage/interface";
import type { EditorState as ProseMirrorState } from "prosemirror-state";

export type Changes = {
  added: Block[];
  updated: Block[];
  deleted: BlockId[];
};

// 编辑器事件
export type EditorEvent =
  | { type: "update"; state: Changes }
  | { type: "root-blocks-changed"; rootBlockIds: BlockId[] }
  // 补全相关事件
  | { type: "completion"; status: CompletionStatus | null }
  | { type: "completion-next" }
  | { type: "completion-prev" }
  | { type: "completion-select" };

export type CompletionStatus = {
  from: number;
  to: number;
  query: string;
  trigger: "[[" | "【【";
};

export type EventListener<T = EditorEvent> = (event: T) => void;

// 编辑器配置选项
export interface EditorConfig {
  initialRootBlockIds?: BlockId[];
  autoSave?: boolean;
}

// 编辑器构造函数类型
export interface EditorConstructor {
  new (storage: BlockStorage, config?: EditorConfig): Editor;
}

// 编辑器接口
export interface Editor {
  readonly id: string;
  mount(dom: HTMLElement): void;
  unmount(): void;
  setRootBlocks(blockIds: BlockId[]): void;
  addEventListener<T extends EditorEvent>(listener: EventListener<T>): void;
  removeEventListener<T extends EditorEvent>(listener: EventListener<T>): void;
  destroy(): void;
  getMarkdown(): string;
  // commands
  coordAtPos: (
    pos: number,
    side?: number,
  ) => {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  executeComplete: (blockId: BlockId) => void;
}
