import type { App, AppEvents } from "@/lib/app/app";
import { withTx } from "@/lib/app/tx";
import type { BlockId, SelectionInfo } from "@/lib/common/types";
import { Node, Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  EditorState,
  TextSelection,
  Transaction,
  type Command,
} from "@tiptap/pm/state";
import {
  getSchema,
  Editor as TiptapEditor,
  type AnyExtension,
} from "@tiptap/vue-3";
import type { Emitter } from "mitt";
import mitt from "mitt";
import { nanoid } from "nanoid";
import { renderOutline } from "../renderers/basic-outline";
import { serialize } from "../utils";
import type { AppView, AppViewId } from "../view";
import { markExtensions } from "./marks";
import { nodeExtensions } from "./nodes";
import { ListItem } from "./nodes/list-item";

declare module "@tiptap/core" {
  interface Editor {
    appView: TiptapEditorView;
  }
}

declare module "@tiptap/vue-3" {
  interface Editor {
    appView: TiptapEditorView;
  }
}

export type ExtensionFn = (editor: TiptapEditorView) => AnyExtension;

export type CompletionStatus = {
  from: number;
  to: number;
  query: string;
  trigger: "[[" | "【【" | "#";
  isTag?: boolean;
};

export type TiptapEditorViewOptions = {
  id: AppViewId;
  rootBlockIds: BlockId[];
  renderer: (editor: TiptapEditorView) => ProseMirrorNode;
  extensions: (AnyExtension | ExtensionFn)[];
};

export type TiptapEditorViewEvents = {
  "root-blocks-changed": { rootBlockIds: BlockId[] };
  completion: { status: CompletionStatus | null };
  "completion-next": void;
  "completion-prev": void;
  "completion-select": void;
  focus: void;
};

const renderers = {
  basicOutline: renderOutline,
};

const allExtensions: (AnyExtension | ExtensionFn)[] = [
  ...nodeExtensions,
  ...markExtensions,
];

export const schema = getSchema([...nodeExtensions, ...markExtensions]);

function withDefaults(
  params: Partial<TiptapEditorViewOptions>
): TiptapEditorViewOptions {
  return {
    id: params.id ?? nanoid(),
    rootBlockIds: params.rootBlockIds ?? [],
    renderer: params.renderer ?? renderers.basicOutline,
    extensions: params.extensions ?? allExtensions,
  };
}

const STORAGE_SYNC_META_KEY = "fromStorage";

/**
 * 将相对一个块开头的偏移量转换为文档内的绝对位置
 */
function getAbsPos(
  doc: ProseMirrorNode,
  blockId: BlockId,
  offset: number
): number | null {
  let absolutePos: number | null = null;
  doc.descendants((node, pos) => {
    if (absolutePos !== null) return false; // 已找到，停止搜索

    if (node.type.name === ListItem.name && node.attrs.blockId === blockId) {
      // listItem 的内容是 paragraph，文本从 pos + 2 开始。
      const paragraphNode = node.firstChild;
      if (paragraphNode) {
        const maxOffset = paragraphNode.content.size;
        const finalOffset = Math.min(offset, maxOffset);
        absolutePos = pos + 1 + 1 + finalOffset;
      }
      return false; // 停止搜索
    }
  });
  return absolutePos;
}

export function findCurrListItem(state: EditorState) {
  const { $from } = state.selection;
  for (let i = $from.depth; i > 0; i--) {
    const node = $from.node(i);
    if (node.type.name === ListItem.name) {
      return { node, depth: i, pos: $from.before(i) };
    }
  }
  return null;
}

/**
 *  查找包含给定文档位置的 listItem 节点
 * @param doc Prosemirror 文档
 * @param pos 文档中的绝对位置
 */
export function findListItemAtPos(doc: Node, pos: number) {
  const $pos = doc.resolve(pos);
  for (let i = $pos.depth; i > 0; i--) {
    const node = $pos.node(i);
    if (node.type.name === ListItem.name) {
      return { node, pos: $pos.before(i) };
    }
  }
  return null;
}

export class TiptapEditorView implements AppView<TiptapEditorViewEvents> {
  id: AppViewId;
  app: App;
  tiptap: TiptapEditor | null;
  rootBlockIds: BlockId[];
  renderer: (editor: TiptapEditorView) => ProseMirrorNode;
  extensions: AnyExtension[];
  // 事件监听器
  #appTxCommittedHandler: ((event: AppEvents["tx-committed"]) => void) | null;
  #clickHandler: ((e: MouseEvent) => void) | null;
  #contextMenuHandler: ((e: MouseEvent) => void) | null;
  #focusHandler: (() => void) | null;
  // 事件总线
  eb: Emitter<TiptapEditorViewEvents>;
  on: Emitter<TiptapEditorViewEvents>["on"];
  off: Emitter<TiptapEditorViewEvents>["off"];
  deferredContentSyncTask: (() => void) | null;

  constructor(app: App, params: Partial<TiptapEditorViewOptions> = {}) {
    const options = withDefaults(params);
    this.id = options.id;
    this.app = app;
    this.tiptap = null;
    this.rootBlockIds = options.rootBlockIds;
    this.renderer = options.renderer;
    this.extensions = options.extensions.map((extension) =>
      typeof extension === "function" ? extension(this) : extension
    );
    this.#appTxCommittedHandler = null;
    this.#clickHandler = null;
    this.#contextMenuHandler = null;
    this.#focusHandler = null;
    this.eb = mitt<TiptapEditorViewEvents>();
    this.on = this.eb.on;
    this.off = this.eb.off;
    this.deferredContentSyncTask = null;
  }

  mount(el: HTMLElement): void {
    if (this.tiptap) {
      console.warn("Editor already mounted, unmount it");
      this.unmount();
    }

    const tiptap = new TiptapEditor({
      element: el,
      extensions: this.extensions,
    });
    tiptap.appView = this; // 用于在 tiptap 中访问 appView
    this.tiptap = tiptap;

    // 覆盖默认的 dispatchTransaction
    this.tiptap.view.props.dispatchTransaction =
      this.#wrapDispatchTransaction();

    // 注册 focus 监听器
    this.#focusHandler = () => {
      this.eb.emit("focus");
    };
    this.tiptap.view.dom.addEventListener("focus", this.#focusHandler);

    setTimeout(() => {
      this.#rerender();
      this.#startTxCommittedListener();
    });
  }

  unmount(): void {
    this.tiptap?.destroy();
  }

  hasFocus(): boolean {
    return this.tiptap != null && this.tiptap.isFocused;
  }

  execCommand(command: Command, dispatch?: boolean) {
    if (!this.tiptap) throw new Error("Editor not mounted");
    const view = this.tiptap.view;
    if (dispatch) command(view.state, view.dispatch, view);
    else command(view.state, undefined, undefined);
  }

  getSelectionInfo(): SelectionInfo | null {
    if (!this.tiptap) throw new Error("Editor not mounted");
    const state = this.tiptap.state;
    const sel = state.selection;
    const listItemInfo = findCurrListItem(state);
    return listItemInfo && listItemInfo.node.attrs.blockId
      ? {
          viewId: this.id,
          blockId: listItemInfo.node.attrs.blockId,
          anchor: sel.from - (listItemInfo.pos + 2),
        }
      : null;
  }

  coordAtPos(pos: number): {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } {
    if (!this.tiptap) throw new Error("Editor not mounted");
    const coords = this.tiptap.view.coordsAtPos(pos);
    return {
      left: coords.left,
      right: coords.right,
      top: coords.top,
      bottom: coords.bottom,
    };
  }

  getFocusedBlockId(): BlockId | null {
    if (!this.tiptap) throw new Error("Editor not mounted");
    const state = this.tiptap.state;
    const sel = state.selection;
    const listItemInfo = findCurrListItem(state);
    return listItemInfo?.node.attrs.blockId ?? null;
  }

  setRootBlockIds(rootBlockIds: BlockId[]): void {
    this.rootBlockIds = rootBlockIds;
    // 触发一次重绘来更新视图
    if (this.tiptap) {
      this.#rerender(undefined, true);
    }
    // 触发根块变更事件
    this.eb.emit("root-blocks-changed", { rootBlockIds });
  }

  canUndo(): boolean {
    throw new Error("Not implemented");
  }

  canRedo(): boolean {
    throw new Error("Not implemented");
  }

  undo(): void {
    throw new Error("Not implemented");
  }

  redo(): void {
    throw new Error("Not implemented");
  }

  locateBlock(blockId: BlockId) {
    throw new Error("Not implemented");
  }

  #rerender(selection?: SelectionInfo, fromStorageSync = false) {
    if (!this.tiptap) throw new Error("Editor not mounted");

    // 整个文档替换
    const newDoc = this.renderer(this);
    const state = this.tiptap.state;
    let tr = state.tr.replaceWith(0, state.doc.content.size, newDoc);

    // 如果是来自存储同步，加上 STORAGE_SYNC_META_KEY 标记
    if (fromStorageSync) {
      tr = tr.setMeta(STORAGE_SYNC_META_KEY, true);
    }

    // 如果指定了要恢复的选区，并且选区属于当前编辑器，则恢复
    if (selection != null && selection.viewId === this.id) {
      const anchor = getAbsPos(tr.doc, selection.blockId, selection.anchor);
      const head = selection.head
        ? (getAbsPos(tr.doc, selection.blockId, selection.head) ?? undefined)
        : undefined;
      if (anchor !== null) {
        tr = tr.setSelection(TextSelection.create(tr.doc, anchor, head));
      }
      if (selection.scrollIntoView) {
        tr = tr.scrollIntoView();
      }
      this.tiptap.view.focus();
    }

    this.tiptap.view.dispatch(tr);
  }

  #wrapDispatchTransaction() {
    // 保存 tiptap 的实现
    if (!this.tiptap) throw new Error("Editor not mounted");
    const defaultImpl = this.tiptap.view.props.dispatchTransaction!;

    return (transaction: Transaction) => {
      if (!this.tiptap) throw new Error("Editor not mounted");

      // 先记录当前选区
      const beforeSelection = this.getSelectionInfo() ?? undefined;

      // 调用默认实现
      defaultImpl(transaction);

      // 如果文档内容被用户修改，则同步到应用层
      if (
        transaction.docChanged &&
        !transaction.getMeta(STORAGE_SYNC_META_KEY)
      ) {
        // 如果使用输入法输入，则在 compositionend 事件时才触发同步
        if (this.tiptap.view.composing) {
          this.deferredContentSyncTask = () => {
            this.#syncContentChangesToApp(transaction, beforeSelection);
            this.deferredContentSyncTask = null;
          };
        } else {
          this.#syncContentChangesToApp(transaction, beforeSelection);
        }
      }
    };
  }

  #syncContentChangesToApp(tr: Transaction, beforeSelection?: SelectionInfo) {
    // 这样做能 work，基于传入的 transaction 的每个 step 只操作单个 listItem
    // 不会一个 step 操作多个 listItem
    //
    // 遍历所有 step，然后将 step 涉及范围内的一个 pos（from 或 pos）
    // 映射到新文档，然后添加到 positions 中
    const positions: number[] = [];
    for (let i = 0; i < tr.steps.length; i++) {
      const step = tr.steps[i];
      const mapping = tr.mapping.slice(i);

      if ("from" in step) {
        if (typeof step.from === "number") {
          const fromNew = mapping.map(step.from, -1);
          positions.push(fromNew);
        }
      } else if ("pos" in step) {
        if (typeof step.pos === "number") {
          const fromNew = mapping.map(step.pos, -1);
          positions.push(fromNew);
        }
      }
    }

    const updatedIds = new Set<BlockId>();
    for (const pos of positions) {
      const listItem = findListItemAtPos(tr.doc, pos);
      if (listItem != null) {
        const blockId = listItem.node.attrs.blockId as BlockId;

        // 如果已经更新过，则跳过，防止重复更新一个块
        if (updatedIds.has(blockId)) continue;
        updatedIds.add(blockId);

        const newData = serialize(listItem.node.firstChild!);
        console.log("update block", blockId, newData);
        withTx(this.app, (tx) => {
          tx.updateBlock(blockId, newData);
          tx.setOrigin("localEditorContent" + this.id);
          beforeSelection && tx.setBeforeSelection(beforeSelection);
        });
      }
    }
  }

  #startTxCommittedListener() {
    this.#appTxCommittedHandler = (event) => {
      if (!this.tiptap) return;

      // 如果事件是来自本地编辑器的内容变更，则不更新视图
      if (event.meta.origin === "localEditorContent" + this.id) return;

      // 计算目标选区
      const selection =
        event.meta.selection ?? this.getSelectionInfo() ?? undefined;

      // 更新视图
      this.#rerender(selection, true);
    };
    this.app.on("tx-committed", this.#appTxCommittedHandler);
  }
}
