import type { Emitter } from "mitt";
import { nanoid } from "nanoid";
import { inputRules } from "prosemirror-inputrules";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { imeSpan } from "prosemirror-safari-ime-span";
import { EditorState, TextSelection, Transaction } from "prosemirror-state";
import { EditorView, type NodeViewConstructor } from "prosemirror-view";
import type { App, AppEvents } from "../app/app";
import type { BlockId, SelectionInfo } from "../common/types";
import { toggleFocusedFoldState } from "./commands";
import { toCodeblock } from "./input-rules/to-codeblock";
import { createKeymapPlugin } from "./keymap";
import { createBlockRefNodeViewClass } from "./node-views/block-ref";
import { createFileNodeViewClass } from "./node-views/file";
import { createListItemNodeViewClass } from "./node-views/list-item";
import { createCompletionHelperPlugin } from "./plugins/block-ref-completion";
import { createHighlightCodeblockPlugin } from "./plugins/highlight-codeblock";
import { createPasteHtmlAndTextPlugin } from "./plugins/paste-text";
import { outlinerSchema } from "./schema";
import {
  clipboard,
  createStateFromStorage,
  findListItemAtPos,
  normalizeSelection,
  serialize,
  toMarkdown,
} from "./utils";
import mitt from "mitt";
import { withTx } from "../app/tx";
import {
  getBlockPath,
  getRootBlockIds,
  getRootBlockNodes,
} from "../app/block-manage";
import { useLlm } from "@/composables/use-llm.ts/useLlm";
import { watch } from "vue";
import type {
  MenuItem,
  MenuItemDef,
  MenuSubMenu,
} from "@/composables/useContextMenu";
import { Clipboard } from "lucide-vue-next";
import { unregisterEditor } from "../app/editors";
import { createPasteImagePlugin } from "./plugins/paste-image";
import { createCompositionFixPlugin } from "./plugins/composition-fix";

// 编辑器事件
export type EditorEvents = {
  "root-blocks-changed": { rootBlockIds: BlockId[] };
  completion: { status: CompletionStatus | null };
  "completion-next": void;
  "completion-prev": void;
  "completion-select": void;
  focus: void;
};

export type CompletionStatus = {
  from: number;
  to: number;
  query: string;
  trigger: "[[" | "【【";
};

export type Editor = {
  id: string;
  app: App;
  view: EditorView | null;
  rootBlockIds: BlockId[];
  // 事件监听器
  storageEventHandler: ((event: AppEvents["tx-committed"]) => void) | null;
  clickHandler: ((e: MouseEvent) => void) | null;
  contextMenuHandler: ((e: MouseEvent) => void) | null;
  // 事件总线
  eb: Emitter<EditorEvents>;
  on: Emitter<EditorEvents>["on"];
  off: Emitter<EditorEvents>["off"];
  // // undo-redo
  // undoStack: OpSequence[];
  // redoStack: OpSequence[];
  // idMapping: Record<string, BlockId>;
  // 是否在只有一个根块时，放大显示根块，少一个层级
  enableEnlargeRootBlock: boolean;
  deferredContentSyncTask: (() => void) | null;
};

export const STORAGE_SYNC_META_KEY = "fromStorage";

export type EditorId = string;

export type EditorOptions = {
  id?: EditorId;
  rootBlockIds?: BlockId[];
  enlargeRootBlock?: boolean;
};

function createEditor(app: App, opts: EditorOptions = {}) {
  const eb = mitt<EditorEvents>();
  const editor = {
    id: opts.id ?? nanoid(),
    app,
    view: null,
    rootBlockIds: opts.rootBlockIds ?? [],
    storageEventHandler: null,
    clickHandler: null,
    contextMenuHandler: null,
    eb,
    on: eb.on,
    off: eb.off,
    enableEnlargeRootBlock: opts.enlargeRootBlock ?? true,
    deferredContentSyncTask: null,
  } satisfies Editor;
  return editor;
}

function getFocusedBlockId(editor: Editor) {
  if (!editor.view) return null;
  const state = editor.view.state;
  const sel = state.selection;
  const listItemInfo = findCurrListItem(state);
  return listItemInfo && listItemInfo.node.attrs.blockId
    ? listItemInfo.node.attrs.blockId
    : null;
}

/**
 * 注册存储事件监听器，用于在（非内容变更）事务提交后更新视图
 */
function startTxCommittedListener(editor: Editor) {
  editor.app.on("tx-committed", (event) => {
    if (!editor.view) return;

    // 如果事件是来自本地编辑器的内容变更，则不更新视图
    if (event.meta.origin === "localEditorContent" + editor.id) return;

    // 计算应用事务后的新状态
    const newDoc = createStateFromStorage(editor.app, editor.rootBlockIds);
    const selection =
      event.meta.selection ?? getSelectionInfo(editor) ?? undefined;

    // 更新视图
    updateViewWithNewDocument(newDoc, editor, selection, true);
  });
}

/**
 * 注册 thinkingBlockIds 事件监听器，用于在 thinkingBlockIds 变化时更新视图
 */
function startThinkingStateListener(editor: Editor) {
  const { thinkingBlockIds } = useLlm(editor.app); // 暂时使用默认配置
  watch(
    thinkingBlockIds,
    () => {
      if (!editor.view) return;
      console.log("thinkingBlockIds changed", thinkingBlockIds.value);

      // 计算新状态
      const newDoc = createStateFromStorage(editor.app, editor.rootBlockIds);
      const selection = getSelectionInfo(editor) ?? undefined;

      // 更新视图
      updateViewWithNewDocument(newDoc, editor, selection, true);
    },
    { deep: true }
  );
}

/**
 * 找到当前选区所在 listItem 节点的信息
 */
export function findCurrListItem(state: EditorState) {
  const { $from } = state.selection;
  for (let i = $from.depth; i > 0; i--) {
    const node = $from.node(i);
    if (node.type.name === "listItem") {
      return { node, depth: i, pos: $from.before(i) };
    }
  }
  return null;
}

/**
 * 将相对位置（块 ID + 块内偏移）转换为绝对位置（相对文档开头的偏移）
 */
export function getAbsPos(
  doc: ProseMirrorNode,
  blockId: BlockId,
  offset: number
): number | null {
  let absolutePos: number | null = null;
  doc.descendants((node, pos) => {
    if (absolutePos !== null) return false; // 已找到，停止搜索

    if (node.type.name === "listItem" && node.attrs.blockId === blockId) {
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

function getSelectionInfo(editor: Editor): SelectionInfo | null {
  if (!editor.view) throw new Error("Editor not mounted");
  const state = editor.view.state;
  const sel = state.selection;
  const listItemInfo = findCurrListItem(state);
  return listItemInfo && listItemInfo.node.attrs.blockId
    ? {
        editorId: editor.id,
        blockId: listItemInfo.node.attrs.blockId,
        anchor: sel.from - (listItemInfo.pos + 2),
      }
    : null;
}

function updateViewWithNewDocument(
  newDoc: ProseMirrorNode,
  editor: Editor,
  selection?: SelectionInfo,
  fromStorageSync = false
) {
  if (!editor.view) throw new Error("Editor not mounted");

  // 整个文档替换
  const state = editor.view.state;
  let tr = state.tr.replaceWith(0, state.doc.content.size, newDoc);

  // 如果是来自存储同步，加上 STORAGE_SYNC_META_KEY 标记
  if (fromStorageSync) {
    tr = tr.setMeta(STORAGE_SYNC_META_KEY, true);
  }

  // 如果指定了要恢复的选区，并且选区属于当前编辑器，则恢复
  if (selection != null && selection.editorId === editor.id) {
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
    editor.view.focus();
  }

  editor.view.dispatch(tr);
}

function getEditorPlugins(editor: Editor) {
  return [
    createCompletionHelperPlugin(editor.eb),
    inputRules({ rules: [toCodeblock] }),
    createKeymapPlugin(editor),
    createHighlightCodeblockPlugin(),
    imeSpan,
    createPasteImagePlugin(editor),
    createPasteHtmlAndTextPlugin(editor),
    createCompositionFixPlugin(editor),
  ];
}

function getEditorNodeViews(
  editor: Editor
): Record<string, NodeViewConstructor> {
  return {
    blockRef(node, view, getPos) {
      const clz = createBlockRefNodeViewClass(editor.app);
      return new clz(node, view, getPos);
    },
    listItem(node, view, getPos) {
      const clz = createListItemNodeViewClass(editor.app);
      return new clz(node, view, getPos);
    },
    file(node, view, getPos) {
      const clz = createFileNodeViewClass(editor.app);
      return new clz(node, view, getPos);
    },
  };
}

/**
 * 获得一个 dispatchTransaction 函数，用于替换 ProseMirror 的默认实现。
 * 相比默认实现，这个函数会：
 *
 * 1. 应用事务前规范化选区，确保正确处理跨块选区
 * 2. 将内容改动同步到应用层（注意：结构变动不走这里！！！）
 */
function getDispatchTransaction(editor: Editor) {
  return (transaction: Transaction) => {
    if (!editor.view) return;

    // 先记录当前选区
    const beforeSelection = getSelectionInfo(editor) ?? undefined;

    // 立即应用事务
    // transaction = normalizeSelection(transaction); // 先规范化选区
    const newState = editor.view.state.apply(transaction);
    editor.view.updateState(newState);

    // 如果文档内容被用户修改，则同步到应用层
    if (transaction.docChanged && !transaction.getMeta(STORAGE_SYNC_META_KEY)) {
      // 如果使用输入法输入，则在 compositionend 事件时才触发同步
      if (editor.view.composing) {
        editor.deferredContentSyncTask = () => {
          syncContentChangesToApp(editor, transaction, beforeSelection);
          editor.deferredContentSyncTask = null;
        };
      } else {
        syncContentChangesToApp(editor, transaction, beforeSelection);
      }
    }
  };
}

function syncContentChangesToApp(
  editor: Editor,
  tr: Transaction,
  beforeSelection?: SelectionInfo
) {
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
      withTx(editor.app, (tx) => {
        tx.updateBlock(blockId, newData);
        tx.setOrigin("localEditorContent" + editor.id);
        beforeSelection && tx.setBeforeSelection(beforeSelection);
      });
    }
  }
}

/**
 * 定位到一个块，如果这个块当前因为折叠看不到，
 * 会将其所有祖先块中折叠的块全部展开；如果这个
 * 块因为不在当前任何根块所在的子树而看不到，则
 * 调整根块为当前根块与这个块的公共父块，然后将
 * 选区设置为这个块末尾，并且滚动到这个块
 */
async function locateBlock(editor: Editor, blockId: BlockId) {
  await withTx(editor.app, (tx) => {
    // 1. 获取目标块的完整路径
    const targetPath = tx.getBlockPath(blockId);
    if (!targetPath) {
      return;
    }

    // 2. 展开所有祖先块中折叠的块
    // targetPath 包含目标块本身，所以我们需要排除最后一个元素
    const ancestors = targetPath.slice(0, -1);
    for (const ancestorId of ancestors) {
      tx.updateBlock(ancestorId, { folded: false });
    }

    // 3. 确定根块：找到当前根块与目标块的公共父块
    const currentRoots =
      editor.rootBlockIds.length > 0
        ? editor.rootBlockIds
        : getRootBlockIds(editor.app); // todo

    let newRootBlocks: BlockId[] = [];

    if (currentRoots.length === 0 || currentRoots.length > 1) {
      // 如果当前没有根块，显示所有根块
      newRootBlocks = [];
    } else {
      // 寻找公共父块
      let commonAncestor: BlockId | null = null;

      for (const rootId of currentRoots) {
        const rootPath = tx.getBlockPath(rootId);
        if (!rootPath) continue;

        for (let i = 0; i < Math.min(rootPath.length, targetPath.length); i++) {
          if (rootPath[i] === targetPath[i]) {
            commonAncestor = rootPath[i];
          } else {
            break;
          }
        }

        if (commonAncestor) {
          break;
        }
      }

      // 如果找到公共祖先，使用它作为新的根块
      if (commonAncestor) {
        newRootBlocks = [commonAncestor];
      } else {
        // 如果没有公共祖先，显示所有根块
        newRootBlocks = [];
      }
    }
    setRootBlockIds(editor, newRootBlocks);
    tx.setOrigin("localEditorStructural");
  });

  // 聚焦到目标块
  setTimeout(() => {
    if (!editor.view) return;
    const doc = editor.view.state.doc;
    const absPos = getAbsPos(doc, blockId, 0);
    if (absPos == null) return;
    const sel = TextSelection.create(doc, absPos);
    const tr = editor.view.state.tr.setSelection(sel).scrollIntoView();
    editor.view.focus();
    editor.view.dispatch(tr);
  });
}

function setRootBlockIds(editor: Editor, rootBlockIds: BlockId[]) {
  editor.rootBlockIds = rootBlockIds;
  // 触发一次重绘来更新视图
  if (editor.view) {
    updateViewWithNewDocument(
      createStateFromStorage(editor.app, rootBlockIds),
      editor,
      undefined,
      true
    );
  }
  // 触发一次根块变更事件
  editor.eb.emit("root-blocks-changed", { rootBlockIds });
}

function getContextMenuHandler(editor: Editor) {
  return (e: MouseEvent) => {
    let tgt = e.target;

    let clickedBlockId: BlockId | null = null;
    let clickedBullet = false;

    while (tgt instanceof Node) {
      if (tgt instanceof HTMLElement && tgt.classList.contains("list-item")) {
        clickedBlockId = tgt.dataset.blockId as BlockId;
      } else if (
        tgt instanceof SVGElement &&
        tgt.classList.contains("bullet")
      ) {
        clickedBullet = true;
      }
      tgt = tgt.parentNode;
    }

    // 右键点击 bullet 时，显示上下文菜单
    if (clickedBlockId && clickedBullet) {
      e.preventDefault();

      // 动态导入 composable 和图标
      import("@/composables").then(({ useContextMenu }) => {
        const contextMenu = useContextMenu();

        // 动态导入图标
        Promise.all([
          import("lucide-vue-next").then((icons) => icons.Download),
          import("lucide-vue-next").then((icons) => icons.Copy),
          import("lucide-vue-next").then((icons) => icons.Trash2),
          import("lucide-vue-next").then((icons) => icons.Link),
        ]).then(([DownloadIcon, CopyIcon, Trash2Icon, LinkIcon]) => {
          const menuItems = [
            {
              type: "submenu",
              label: "复制为...",
              icon: CopyIcon,
              children: [
                {
                  type: "item",
                  label: "Markdown",
                  action: () => {
                    const markdown = toMarkdown(editor.app, [clickedBlockId]);
                    clipboard.writeText(markdown);
                  },
                },
                {
                  type: "item",
                  label: "纯文本",
                  action: () => {},
                },
                {
                  type: "item",
                  label: "HTML",
                  action: () => {},
                },
                {
                  type: "item",
                  label: "块引用",
                  action: () => {},
                },
              ],
            } satisfies MenuSubMenu,
            {
              type: "submenu",
              label: "粘贴为...",
              icon: Clipboard,
              children: [
                {
                  type: "item",
                  label: "Markdown",
                  action: () => {},
                },
                {
                  type: "item",
                  label: "纯文本",
                  action: () => {},
                },
                {
                  type: "item",
                  label: "HTML",
                  action: () => {},
                },
              ],
            },
            {
              type: "item",
              label: "删除",
              icon: Trash2Icon,
              action: () => {
                // TODO
                console.log("删除子树");
              },
              danger: true,
            } satisfies MenuItem,
          ] satisfies MenuItemDef[];

          console.log("show context menu", e.clientX, e.clientY);
          contextMenu.show(e.clientX, e.clientY, menuItems);
        });
      });
    }
  };
}

function getClickHandler(editor: Editor) {
  return (e: MouseEvent) => {
    let tgt = e.target;

    // 点击块引用
    if (tgt instanceof HTMLSpanElement && tgt.classList.contains("block-ref")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const tgtBlockId = tgt.dataset.blockId;
      if (tgtBlockId != null) {
        locateBlock(editor, tgtBlockId as BlockId);
      }
      return;
    }

    let clickedBlockId: BlockId | null = null;
    let clickedFoldBtn = false;
    let clickedBullet = false;

    while (tgt instanceof Node) {
      if (tgt instanceof HTMLElement && tgt.classList.contains("list-item")) {
        clickedBlockId = tgt.dataset.blockId as BlockId;
      } else if (tgt instanceof SVGElement) {
        if (tgt.classList.contains("fold-btn")) {
          clickedFoldBtn = true;
        } else if (tgt.classList.contains("bullet")) {
          clickedBullet = true;
        }
      }
      tgt = tgt.parentNode;
    }

    if (clickedBlockId) {
      if (clickedFoldBtn) {
        // 点击折叠按钮时，触发折叠展开命令
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!editor.view) throw new Error("Editor not mounted");
        const { state, dispatch } = editor.view;
        toggleFocusedFoldState(
          editor,
          undefined,
          clickedBlockId
        )(state, dispatch);
      } else if (clickedBullet) {
        // 点击 bullet 时，聚焦到这个块（设置为根块）
        e.preventDefault();
        e.stopImmediatePropagation();
        setRootBlockIds(editor, [clickedBlockId]);
      }
    }
  };
}

function isFocused(editor: Editor) {
  return editor.view?.hasFocus();
}

function coordAtPos(editor: Editor, pos: number) {
  if (!editor.view) throw new Error("Editor not mounted");
  return editor.view.coordsAtPos(pos);
}

function mount(editor: Editor, dom: HTMLElement) {
  if (editor.view) {
    console.warn("Editor already mounted, unmount it");
    unmount(editor);
  }

  // dom 上加上一个属性指示根块数量
  const updateNRoots = () => {
    const nRoots =
      editor.rootBlockIds.length === 0
        ? getRootBlockNodes(editor.app).length
        : editor.rootBlockIds.length;
    dom.dataset.nRoots = String(nRoots);
  };

  updateNRoots();
  editor.on("root-blocks-changed", updateNRoots);

  // 在 dom 上加上 class 指示编辑器是否启用放大根块的功能
  const updateEnableEnlargeRootBlock = () => {
    if (editor.enableEnlargeRootBlock) {
      dom.classList.add("enlarge-root-block");
    } else {
      dom.classList.remove("enlarge-root-block");
    }
  };
  updateEnableEnlargeRootBlock();

  const doc = createStateFromStorage(editor.app, editor.rootBlockIds);

  const state = EditorState.create({
    schema: outlinerSchema,
    plugins: getEditorPlugins(editor),
    doc,
  });

  editor.view = new EditorView(dom, {
    state,
    nodeViews: getEditorNodeViews(editor),
    dispatchTransaction: getDispatchTransaction(editor),
  });

  editor.clickHandler = getClickHandler(editor);
  editor.view.dom.addEventListener("click", editor.clickHandler);

  editor.contextMenuHandler = getContextMenuHandler(editor);
  editor.view.dom.addEventListener("contextmenu", editor.contextMenuHandler);

  editor.view.dom.addEventListener("focus", () => editor.eb.emit("focus"));

  startTxCommittedListener(editor);
  startThinkingStateListener(editor);
}

function unmount(editor: Editor) {
  if (!editor.view) {
    console.warn("Editor not mounted, cannot unmount");
    return;
  }
  if (editor.clickHandler) {
    editor.view.dom.removeEventListener("click", editor.clickHandler);
  }
  editor.view.destroy();
  editor.view = null;
  editor.clickHandler = null;
  unregisterEditor(editor.app, editor.id);
}

function focusEditor(editor: Editor) {
  if (!editor.view) {
    console.warn("Editor not mounted, cannot focus");
    return;
  }
  editor.view.focus();
}

async function undo(editor: Editor) {
  const { app } = editor;
  if (app.undoStack.length === 0) return;
  const lastTx = app.undoStack.pop()!;

  // 撤销前，将当前的选区信息记录到 afterSelection
  const afterSelection = getSelectionInfo(editor);
  lastTx.afterSelection = afterSelection ?? undefined;

  const id2Tmp: Record<BlockId, BlockId> = {};
  const mapId = (id: BlockId) => id2Tmp[id] ?? app.idMapping[id] ?? id;
  const { idMapping: tmp2newId } = await withTx(app, (tx) => {
    for (let i = lastTx.executedOps.length - 1; i >= 0; i--) {
      const op = lastTx.executedOps[i];
      if (op.type === "block:create") {
        const blockId = mapId(op.blockId);
        tx.deleteBlock(blockId);
      } else if (op.type === "block:delete") {
        const oldParentId = op.oldParent ? mapId(op.oldParent) : null;
        const newBlockId = tx.createBlockUnder(oldParentId, op.oldIndex, {
          type: op.oldData.type,
          folded: op.oldData.folded,
          content: op.oldData.content,
        });
        id2Tmp[op.blockId] = newBlockId;
      } else if (op.type === "block:move") {
        const targetId = mapId(op.blockId);
        const parentId = op.oldParent ? mapId(op.oldParent) : null;
        tx.moveBlock(targetId, parentId, op.oldIndex);
      } else if (op.type === "block:update") {
        const blockId = mapId(op.blockId);
        tx.updateBlock(blockId, op.oldData);
      }
    }

    // 撤销时，需要恢复到撤销前的选区状态
    if (lastTx.beforeSelection) {
      const sel = lastTx.beforeSelection;
      const mappedSel = {
        ...sel,
        blockId: mapId(sel.blockId),
      };
      tx.setSelection(mappedSel);
    }
    tx.setOrigin("undoRedo");
  });

  for (const [oldId, tmpId] of Object.entries(id2Tmp)) {
    const newId = tmp2newId[tmpId];
    app.idMapping[oldId as BlockId] = newId;
  }

  app.redoStack.push(lastTx);
}

export function canUndo(editor: Editor) {
  return editor.app.undoStack.length > 0;
}

export function canRedo(editor: Editor) {
  return editor.app.redoStack.length > 0;
}

async function redo(editor: Editor) {
  const { app } = editor;
  if (app.undoStack.length === 0) return;
  const lastTx = app.redoStack.pop()!;

  const id2Tmp: Record<BlockId, BlockId> = {};
  const mapId = (id: BlockId) => id2Tmp[id] ?? app.idMapping[id] ?? id;
  const { idMapping: tmp2newId } = await withTx(app, (tx) => {
    for (const op of lastTx.executedOps) {
      if (op.type === "block:create") {
        const parentId = op.parent ? mapId(op.parent) : null;
        const newBlockId = tx.createBlockUnder(parentId, op.index, {
          type: op.data.type,
          folded: op.data.folded,
          content: op.data.content,
        });
        id2Tmp[op.blockId] = newBlockId;
      } else if (op.type === "block:delete") {
        const blockId = mapId(op.blockId);
        tx.deleteBlock(blockId);
      } else if (op.type === "block:move") {
        const targetId = mapId(op.blockId);
        const parentId = op.parent ? mapId(op.parent) : null;
        tx.moveBlock(targetId, parentId, op.index);
      } else if (op.type === "block:update") {
        const blockId = mapId(op.blockId);
        tx.updateBlock(blockId, op.newData);
      }
    }

    // 重做时，需要恢复到重做后的选区状态
    if (lastTx.afterSelection) {
      const sel = lastTx.afterSelection;
      const mappedSel = {
        ...sel,
        blockId: mapId(sel.blockId),
      };
      tx.setSelection(mappedSel);
    }
    tx.setOrigin("undoRedo");
  });

  for (const [oldId, tmpId] of Object.entries(id2Tmp)) {
    const newId = tmp2newId[tmpId];
    app.idMapping[oldId as BlockId] = newId;
  }

  app.undoStack.push(lastTx);
}

export const editorUtils = {
  createEditor,
  getFocusedBlockId,
  mount,
  unmount,
  getSelectionInfo,
  locateBlock,
  setRootBlockIds,
  isFocused,
  coordAtPos,
  focusEditor,
  canUndo,
  canRedo,
  undo,
  redo,
};
