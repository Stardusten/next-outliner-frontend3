// import type {
//   MenuItem,
//   MenuItemDef,
//   MenuSubMenu,
// } from "@/composables/useContextMenu";
// import { Clipboard } from "lucide-vue-next";
// import type { Emitter } from "mitt";
// import mitt from "mitt";
// import { nanoid } from "nanoid";
// import { inputRules } from "prosemirror-inputrules";
// import type { Node as ProseMirrorNode } from "prosemirror-model";
// import { imeSpan } from "prosemirror-safari-ime-span";
// import type { Plugin } from "prosemirror-state";
// import { EditorState, TextSelection, Transaction } from "prosemirror-state";
// import { EditorView, type NodeViewConstructor } from "prosemirror-view";
// import type { App, AppEvents } from "../app/app";
// import { getRootBlockIds, getRootBlockNodes } from "../app/block-manage";
// import { unregisterEditor } from "../app/editors";
// import { withTx } from "../app/tx";
// import type { BlockId, SelectionInfo } from "../common/types";
// import { toggleFocusedFoldState } from "./commands";
// import { toCodeblock } from "./input-rules/to-codeblock";
// import { createMainEditorKeymap } from "./keymap/main-editor";
// import { createBlockRefNodeViewClass } from "./node-views/block-ref";
// import { createFileNodeViewClass } from "./node-views/file";
// import { createListItemNodeViewClass } from "./node-views/list-item";
// import { createCompletionHelperPlugin } from "./plugins/block-ref-completion";
// import { createCompositionFixPlugin } from "./plugins/composition-fix";
// import { createHighlightCodeblockPlugin } from "./plugins/highlight-codeblock";
// import { createPasteImagePlugin } from "./plugins/paste-image";
// import { createPasteHtmlAndTextPlugin } from "./plugins/paste-text";
// import { renderOutline } from "./renderers/basic-outline";
// import { clipboard, findListItemAtPos, serialize, toMarkdown } from "./utils";
// import { getSchema, Editor as TiptapEditor } from "@tiptap/vue-3";
// import { Doc } from "./tiptap-editor/nodes/doc";
// import { ListItem } from "./tiptap-editor/nodes/list-item";
// import { Paragraph } from "./tiptap-editor/nodes/paragraph";
// import { Codeblock } from "./tiptap-editor/nodes/codeblock";
// import { Search } from "./tiptap-editor/nodes/serch";
// import { BlockRef } from "./tiptap-editor/nodes/block-ref";
// import { LineBreak } from "./tiptap-editor/nodes/line-break";
// import { Text } from "./tiptap-editor/nodes/text";
// import { Bold } from "./tiptap-editor/marks/bold";
// import { Code } from "./tiptap-editor/marks/code";
// import { Italic } from "./tiptap-editor/marks/italic";
// import { Link } from "./tiptap-editor/marks/link";
// import { StrikeThrough } from "./tiptap-editor/marks/strikethrough";
// import { Underline } from "./tiptap-editor/marks/underline";
// import { File } from "./tiptap-editor/nodes/file";

// export type TiptapEditorViewEvents = {
//   "root-blocks-changed": { rootBlockIds: BlockId[] };
//   completion: { status: CompletionStatus | null };
//   "completion-next": void;
//   "completion-prev": void;
//   "completion-select": void;
//   focus: void;
// };

// export type CompletionStatus = {
//   from: number;
//   to: number;
//   query: string;
//   trigger: "[[" | "【【" | "#";
//   isTag?: boolean;
// };

// export type TiptapEditorViewOptions = {
//   id: EditorId;
//   rootBlockIds: BlockId[];
//   enlargeRootBlock: boolean;
//   renderer: (editor: TiptapEditorView) => ProseMirrorNode;
//   pluginsFn: (editor: TiptapEditorView) => Plugin[];
//   nodeViewsFn: (
//     editor: TiptapEditorView
//   ) => Record<string, NodeViewConstructor>;
// };

// export type TiptapEditorView = {
//   id: string;
//   app: App;
//   tiptap: TiptapEditor | null;
//   rootBlockIds: BlockId[];
//   enlargeRootBlock: boolean;
//   renderer: (editor: TiptapEditorView) => ProseMirrorNode;
//   pluginsFn: (editor: TiptapEditorView) => Plugin[];
//   nodeViewsFn: (
//     editor: TiptapEditorView
//   ) => Record<string, NodeViewConstructor>;
//   // 事件监听器
//   storageEventHandler: ((event: AppEvents["tx-committed"]) => void) | null;
//   clickHandler: ((e: MouseEvent) => void) | null;
//   contextMenuHandler: ((e: MouseEvent) => void) | null;
//   // 事件总线
//   eb: Emitter<TiptapEditorViewEvents>;
//   on: Emitter<TiptapEditorViewEvents>["on"];
//   off: Emitter<TiptapEditorViewEvents>["off"];
//   deferredContentSyncTask: (() => void) | null;
// };

// export const STORAGE_SYNC_META_KEY = "fromStorage";

// export type EditorId = string;

// const allExtensions = [
//   // nodes
//   Doc,
//   ListItem,
//   Paragraph,
//   Codeblock,
//   Search,
//   BlockRef,
//   LineBreak,
//   Text,
//   File,
//   // marks
//   Bold,
//   Code,
//   Italic,
//   Link,
//   StrikeThrough,
//   Underline,
// ];

// export const schema = getSchema(allExtensions);

// const pluginFns = {
//   completionHelper: (editor: TiptapEditorView) =>
//     createCompletionHelperPlugin(editor.eb),
//   inputRules: (editor: TiptapEditorView) =>
//     inputRules({ rules: [toCodeblock] }),
//   highlightCodeblock: (editor: TiptapEditorView) =>
//     createHighlightCodeblockPlugin(),
//   imeSpan: (editor: TiptapEditorView) => imeSpan,
//   pasteImage: (editor: TiptapEditorView) => createPasteImagePlugin(editor),
//   pasteHtmlAndText: (editor: TiptapEditorView) =>
//     createPasteHtmlAndTextPlugin(editor),
//   compositionFix: (editor: TiptapEditorView) =>
//     createCompositionFixPlugin(editor),
//   mainEditorKeymap: (editor: TiptapEditorView) =>
//     createMainEditorKeymap(editor),
// };

// const nodeViewFns = {
//   blockRef: (editor: TiptapEditorView) =>
//     createBlockRefNodeViewClass(editor.app),
//   listItem: (editor: TiptapEditorView) =>
//     createListItemNodeViewClass(editor.app),
//   file: (editor: TiptapEditorView) => createFileNodeViewClass(editor.app),
// };

// const renderers = {
//   basicOutline: renderOutline,
// };

// function withDefaults(
//   params: Partial<TiptapEditorViewOptions>
// ): TiptapEditorViewOptions {
//   const defaultPluginFn = (editor: TiptapEditorView) => {
//     return Object.values(pluginFns).map((fn) => fn(editor));
//   };

//   const defaultNodeViewsFn = (editor: TiptapEditorView) => {
//     const res: Record<string, NodeViewConstructor> = {};
//     for (const [id, nodeViewFn] of Object.entries(nodeViewFns)) {
//       const nodeViewClz = nodeViewFn(editor);
//       res[id] = (node, view, getPos) => new nodeViewClz(node, view, getPos);
//     }
//     return res;
//   };

//   return {
//     id: params.id ?? nanoid(),
//     rootBlockIds: params.rootBlockIds ?? [],
//     enlargeRootBlock: params.enlargeRootBlock ?? true,
//     renderer: params.renderer ?? renderers.basicOutline,
//     pluginsFn: params.pluginsFn ?? defaultPluginFn,
//     nodeViewsFn: params.nodeViewsFn ?? defaultNodeViewsFn,
//   };
// }

// function createEditor(app: App, params: Partial<TiptapEditorViewOptions> = {}) {
//   const eb = mitt<TiptapEditorViewEvents>();
//   const options = withDefaults(params);
//   const editor = {
//     id: options.id,
//     app,
//     tiptap: null,
//     rootBlockIds: options.rootBlockIds,
//     enlargeRootBlock: options.enlargeRootBlock,
//     renderer: options.renderer,
//     pluginsFn: options.pluginsFn,
//     nodeViewsFn: options.nodeViewsFn,
//     storageEventHandler: null,
//     clickHandler: null,
//     contextMenuHandler: null,
//     eb,
//     on: eb.on,
//     off: eb.off,
//     deferredContentSyncTask: null,
//   } satisfies TiptapEditorView;
//   return editor;
// }

// function getFocusedBlockId(editor: TiptapEditorView) {
//   if (!editor.tiptap) return null;
//   const state = editor.tiptap.state;
//   const sel = state.selection;
//   const listItemInfo = findCurrListItem(state);
//   return listItemInfo && listItemInfo.node.attrs.blockId
//     ? listItemInfo.node.attrs.blockId
//     : null;
// }

// /**
//  * 注册存储事件监听器，用于在（非内容变更）事务提交后更新视图
//  */
// function startTxCommittedListener(editor: TiptapEditorView) {
//   editor.app.on("tx-committed", (event) => {
//     if (!editor.tiptap) return;

//     // 如果事件是来自本地编辑器的内容变更，则不更新视图
//     if (event.meta.origin === "localEditorContent" + editor.id) return;

//     // 计算目标选区
//     const selection =
//       event.meta.selection ?? getSelectionInfo(editor) ?? undefined;

//     // 更新视图
//     rerender(editor, selection, true);
//   });
// }

// /**
//  * 找到当前选区所在 listItem 节点的信息
//  */
// export function findCurrListItem(state: EditorState) {
//   const { $from } = state.selection;
//   for (let i = $from.depth; i > 0; i--) {
//     const node = $from.node(i);
//     if (node.type.name === ListItem.name) {
//       return { node, depth: i, pos: $from.before(i) };
//     }
//   }
//   return null;
// }

// /**
//  * 将相对位置（块 ID + 块内偏移）转换为绝对位置（相对文档开头的偏移）
//  */
// export function getAbsPos(
//   doc: ProseMirrorNode,
//   blockId: BlockId,
//   offset: number
// ): number | null {
//   let absolutePos: number | null = null;
//   doc.descendants((node, pos) => {
//     if (absolutePos !== null) return false; // 已找到，停止搜索

//     if (node.type.name === ListItem.name && node.attrs.blockId === blockId) {
//       // listItem 的内容是 paragraph，文本从 pos + 2 开始。
//       const paragraphNode = node.firstChild;
//       if (paragraphNode) {
//         const maxOffset = paragraphNode.content.size;
//         const finalOffset = Math.min(offset, maxOffset);
//         absolutePos = pos + 1 + 1 + finalOffset;
//       }
//       return false; // 停止搜索
//     }
//   });
//   return absolutePos;
// }

// function getSelectionInfo(editor: TiptapEditorView): SelectionInfo | null {
//   if (!editor.tiptap) throw new Error("Editor not mounted");
//   const state = editor.tiptap.state;
//   const sel = state.selection;
//   const listItemInfo = findCurrListItem(state);
//   return listItemInfo && listItemInfo.node.attrs.blockId
//     ? {
//         viewId: editor.id,
//         blockId: listItemInfo.node.attrs.blockId,
//         anchor: sel.from - (listItemInfo.pos + 2),
//       }
//     : null;
// }

// function rerender(
//   editor: TiptapEditorView,
//   selection?: SelectionInfo,
//   fromStorageSync = false
// ) {
//   if (!editor.tiptap) throw new Error("Editor not mounted");

//   // 整个文档替换
//   const newDoc = editor.renderer(editor);
//   const state = editor.tiptap.state;
//   let tr = state.tr.replaceWith(0, state.doc.content.size, newDoc);

//   // 如果是来自存储同步，加上 STORAGE_SYNC_META_KEY 标记
//   if (fromStorageSync) {
//     tr = tr.setMeta(STORAGE_SYNC_META_KEY, true);
//   }

//   // 如果指定了要恢复的选区，并且选区属于当前编辑器，则恢复
//   if (selection != null && selection.viewId === editor.id) {
//     const anchor = getAbsPos(tr.doc, selection.blockId, selection.anchor);
//     const head = selection.head
//       ? (getAbsPos(tr.doc, selection.blockId, selection.head) ?? undefined)
//       : undefined;
//     if (anchor !== null) {
//       tr = tr.setSelection(TextSelection.create(tr.doc, anchor, head));
//     }
//     if (selection.scrollIntoView) {
//       tr = tr.scrollIntoView();
//     }
//     editor.tiptap.view.focus();
//   }

//   editor.tiptap.view.dispatch(tr);
// }

// /**
//  * 在 Tiptap 默认 dispatchTransaction 实现外面包上一层
//  * 虽然可以用 beforeTransaction 和 transaction 事件
//  * 但是很难知道两个事件是同一个 transaction 触发的
//  */
// function wrapDispatchTransaction(editor: TiptapEditorView) {
//   // 保存默认实现
//   const defaultImpl = editor.tiptap?.view.props.dispatchTransaction!;

//   return (transaction: Transaction) => {
//     if (!editor.tiptap) return;

//     // 先记录当前选区
//     const beforeSelection = getSelectionInfo(editor) ?? undefined;

//     // 立即应用事务
//     // transaction = normalizeSelection(transaction); // 先规范化选区
//     defaultImpl(transaction);

//     // 如果文档内容被用户修改，则同步到应用层
//     if (transaction.docChanged && !transaction.getMeta(STORAGE_SYNC_META_KEY)) {
//       // 如果使用输入法输入，则在 compositionend 事件时才触发同步
//       if (editor.tiptap.view.composing) {
//         editor.deferredContentSyncTask = () => {
//           syncContentChangesToApp(editor, transaction, beforeSelection);
//           editor.deferredContentSyncTask = null;
//         };
//       } else {
//         syncContentChangesToApp(editor, transaction, beforeSelection);
//       }
//     }
//   };
// }

// function syncContentChangesToApp(
//   editor: TiptapEditorView,
//   tr: Transaction,
//   beforeSelection?: SelectionInfo
// ) {
//   // 这样做能 work，基于传入的 transaction 的每个 step 只操作单个 listItem
//   // 不会一个 step 操作多个 listItem
//   //
//   // 遍历所有 step，然后将 step 涉及范围内的一个 pos（from 或 pos）
//   // 映射到新文档，然后添加到 positions 中
//   const positions: number[] = [];
//   for (let i = 0; i < tr.steps.length; i++) {
//     const step = tr.steps[i];
//     const mapping = tr.mapping.slice(i);

//     if ("from" in step) {
//       if (typeof step.from === "number") {
//         const fromNew = mapping.map(step.from, -1);
//         positions.push(fromNew);
//       }
//     } else if ("pos" in step) {
//       if (typeof step.pos === "number") {
//         const fromNew = mapping.map(step.pos, -1);
//         positions.push(fromNew);
//       }
//     }
//   }

//   const updatedIds = new Set<BlockId>();
//   for (const pos of positions) {
//     const listItem = findListItemAtPos(tr.doc, pos);
//     if (listItem != null) {
//       const blockId = listItem.node.attrs.blockId as BlockId;

//       // 如果已经更新过，则跳过，防止重复更新一个块
//       if (updatedIds.has(blockId)) continue;
//       updatedIds.add(blockId);

//       const newData = serialize(listItem.node.firstChild!);
//       console.log("update block", blockId, newData);
//       withTx(editor.app, (tx) => {
//         tx.updateBlock(blockId, newData);
//         tx.setOrigin("localEditorContent" + editor.id);
//         beforeSelection && tx.setBeforeSelection(beforeSelection);
//       });
//     }
//   }
// }

// /**
//  * 定位到一个块，如果这个块当前因为折叠看不到，
//  * 会将其所有祖先块中折叠的块全部展开；如果这个
//  * 块因为不在当前任何根块所在的子树而看不到，则
//  * 调整根块为当前根块与这个块的公共父块，然后将
//  * 选区设置为这个块末尾，并且滚动到这个块
//  */
// async function locateBlock(editor: TiptapEditorView, blockId: BlockId) {
//   await withTx(editor.app, (tx) => {
//     // 1. 获取目标块的完整路径
//     const targetPath = tx.getBlockPath(blockId);
//     if (!targetPath) {
//       return;
//     }

//     // 2. 展开所有祖先块中折叠的块
//     // targetPath 包含目标块本身，所以我们需要排除最后一个元素
//     const ancestors = targetPath.slice(0, -1);
//     for (const ancestorId of ancestors) {
//       tx.updateBlock(ancestorId, { folded: false });
//     }

//     // 3. 确定根块：找到当前根块与目标块的公共父块
//     const currentRoots =
//       editor.rootBlockIds.length > 0
//         ? editor.rootBlockIds
//         : getRootBlockIds(editor.app); // todo

//     let newRootBlocks: BlockId[] = [];

//     if (currentRoots.length === 0 || currentRoots.length > 1) {
//       // 如果当前没有根块，显示所有根块
//       newRootBlocks = [];
//     } else {
//       // 寻找公共父块
//       let commonAncestor: BlockId | null = null;

//       for (const rootId of currentRoots) {
//         const rootPath = tx.getBlockPath(rootId);
//         if (!rootPath) continue;

//         for (let i = 0; i < Math.min(rootPath.length, targetPath.length); i++) {
//           if (rootPath[i] === targetPath[i]) {
//             commonAncestor = rootPath[i];
//           } else {
//             break;
//           }
//         }

//         if (commonAncestor) {
//           break;
//         }
//       }

//       // 如果找到公共祖先，使用它作为新的根块
//       if (commonAncestor) {
//         newRootBlocks = [commonAncestor];
//       } else {
//         // 如果没有公共祖先，显示所有根块
//         newRootBlocks = [];
//       }
//     }
//     setRootBlockIds(editor, newRootBlocks);
//     tx.setOrigin("localEditorStructural");
//   });

//   // 聚焦到目标块
//   setTimeout(() => {
//     if (!editor.tiptap) return;
//     const doc = editor.tiptap.state.doc;
//     const absPos = getAbsPos(doc, blockId, 0);
//     if (absPos == null) return;
//     const sel = TextSelection.create(doc, absPos);
//     const tr = editor.tiptap.state.tr.setSelection(sel).scrollIntoView();
//     editor.tiptap.view.focus();
//     editor.tiptap.view.dispatch(tr);
//   });
// }

// function setRootBlockIds(editor: TiptapEditorView, rootBlockIds: BlockId[]) {
//   editor.rootBlockIds = rootBlockIds;
//   // 触发一次重绘来更新视图
//   if (editor.tiptap) {
//     rerender(editor, undefined, true);
//   }
//   // 触发一次根块变更事件
//   editor.eb.emit("root-blocks-changed", { rootBlockIds });
// }

// function getContextMenuHandler(editor: TiptapEditorView) {
//   return (e: MouseEvent) => {
//     let tgt = e.target;

//     let clickedBlockId: BlockId | null = null;
//     let clickedBullet = false;

//     while (tgt instanceof Node) {
//       if (tgt instanceof HTMLElement && tgt.classList.contains("list-item")) {
//         clickedBlockId = tgt.dataset.blockId as BlockId;
//       } else if (
//         tgt instanceof SVGElement &&
//         tgt.classList.contains("bullet")
//       ) {
//         clickedBullet = true;
//       }
//       tgt = tgt.parentNode;
//     }

//     // 右键点击 bullet 时，显示上下文菜单
//     if (clickedBlockId && clickedBullet) {
//       e.preventDefault();

//       // 动态导入 composable 和图标
//       import("@/composables").then(({ useContextMenu }) => {
//         const contextMenu = useContextMenu();

//         // 动态导入图标
//         Promise.all([
//           import("lucide-vue-next").then((icons) => icons.Download),
//           import("lucide-vue-next").then((icons) => icons.Copy),
//           import("lucide-vue-next").then((icons) => icons.Trash2),
//           import("lucide-vue-next").then((icons) => icons.Link),
//         ]).then(([DownloadIcon, CopyIcon, Trash2Icon, LinkIcon]) => {
//           const menuItems = [
//             {
//               type: "submenu",
//               label: "复制为...",
//               icon: CopyIcon,
//               children: [
//                 {
//                   type: "item",
//                   label: "Markdown",
//                   action: () => {
//                     const markdown = toMarkdown(editor.app, [clickedBlockId]);
//                     clipboard.writeText(markdown);
//                   },
//                 },
//                 {
//                   type: "item",
//                   label: "纯文本",
//                   action: () => {},
//                 },
//                 {
//                   type: "item",
//                   label: "HTML",
//                   action: () => {},
//                 },
//                 {
//                   type: "item",
//                   label: "块引用",
//                   action: () => {},
//                 },
//               ],
//             } satisfies MenuSubMenu,
//             {
//               type: "submenu",
//               label: "粘贴为...",
//               icon: Clipboard,
//               children: [
//                 {
//                   type: "item",
//                   label: "Markdown",
//                   action: () => {},
//                 },
//                 {
//                   type: "item",
//                   label: "纯文本",
//                   action: () => {},
//                 },
//                 {
//                   type: "item",
//                   label: "HTML",
//                   action: () => {},
//                 },
//               ],
//             },
//             {
//               type: "item",
//               label: "删除",
//               icon: Trash2Icon,
//               action: () => {
//                 // TODO
//                 console.log("删除子树");
//               },
//               danger: true,
//             } satisfies MenuItem,
//           ] satisfies MenuItemDef[];

//           console.log("show context menu", e.clientX, e.clientY);
//           contextMenu.show(e.clientX, e.clientY, menuItems);
//         });
//       });
//     }
//   };
// }

// function getClickHandler(editor: TiptapEditorView) {
//   return (e: MouseEvent) => {
//     let tgt = e.target;

//     // 点击块引用
//     if (tgt instanceof HTMLSpanElement && tgt.classList.contains("block-ref")) {
//       e.preventDefault();
//       e.stopImmediatePropagation();
//       const tgtBlockId = tgt.dataset.blockId;
//       if (tgtBlockId != null) {
//         locateBlock(editor, tgtBlockId as BlockId);
//       }
//       return;
//     }

//     let clickedBlockId: BlockId | null = null;
//     let clickedFoldBtn = false;
//     let clickedBullet = false;

//     while (tgt instanceof Node) {
//       if (tgt instanceof HTMLElement && tgt.classList.contains("list-item")) {
//         clickedBlockId = tgt.dataset.blockId as BlockId;
//       } else if (tgt instanceof SVGElement) {
//         if (tgt.classList.contains("fold-btn")) {
//           clickedFoldBtn = true;
//         } else if (tgt.classList.contains("bullet")) {
//           clickedBullet = true;
//         }
//       }
//       tgt = tgt.parentNode;
//     }

//     if (clickedBlockId) {
//       if (clickedFoldBtn) {
//         // 点击折叠按钮时，触发折叠展开命令
//         e.preventDefault();
//         e.stopImmediatePropagation();
//         if (!editor.tiptap) throw new Error("Editor not mounted");
//         const { state, dispatch } = editor.tiptap.view;
//         toggleFocusedFoldState(
//           editor,
//           undefined,
//           clickedBlockId
//         )(state, dispatch);
//       } else if (clickedBullet) {
//         // 点击 bullet 时，聚焦到这个块（设置为根块）
//         e.preventDefault();
//         e.stopImmediatePropagation();
//         setRootBlockIds(editor, [clickedBlockId]);
//       }
//     }
//   };
// }

// function isFocused(editor: TiptapEditorView) {
//   return editor.tiptap && editor.tiptap.isFocused;
// }

// function coordAtPos(editor: TiptapEditorView, pos: number) {
//   if (!editor.tiptap) throw new Error("Editor not mounted");
//   return editor.tiptap.view.coordsAtPos(pos);
// }

// function mount(editor: TiptapEditorView) {
//   if (editor.tiptap) {
//     console.warn("Editor already mounted, unmount it");
//     unmount(editor);
//   }

//   // // dom 上加上一个属性指示根块数量
//   // const updateNRoots = () => {
//   //   const nRoots =
//   //     editor.rootBlockIds.length === 0
//   //       ? getRootBlockNodes(editor.app).length
//   //       : editor.rootBlockIds.length;
//   //   dom.dataset.nRoots = String(nRoots);
//   // };

//   // updateNRoots();
//   // editor.on("root-blocks-changed", updateNRoots);

//   // // 在 dom 上加上 class 指示编辑器是否启用放大根块的功能
//   // const updateEnableEnlargeRootBlock = () => {
//   //   if (editor.enlargeRootBlock) {
//   //     dom.classList.add("enlarge-root-block");
//   //   } else {
//   //     dom.classList.remove("enlarge-root-block");
//   //   }
//   // };
//   // updateEnableEnlargeRootBlock();

//   editor.tiptap = new TiptapEditor({
//     content: "",
//     extensions: allExtensions,
//   });

//   // 覆盖默认的 dispatchTransaction
//   editor.tiptap.view.props.dispatchTransaction =
//     wrapDispatchTransaction(editor);

//   setTimeout(() => {
//     rerender(editor, undefined, true);

//     editor.clickHandler = getClickHandler(editor);
//     editor.tiptap.view.dom.addEventListener("click", editor.clickHandler);

//     editor.contextMenuHandler = getContextMenuHandler(editor);
//     editor.tiptap.view.dom.addEventListener(
//       "contextmenu",
//       editor.contextMenuHandler
//     );

//     editor.tiptap.view.dom.addEventListener("focus", () =>
//       editor.eb.emit("focus")
//     );

//     startTxCommittedListener(editor);
//   });
// }

// function unmount(editor: TiptapEditorView) {
//   if (!editor.tiptap) {
//     console.warn("Editor not mounted, cannot unmount");
//     return;
//   }
//   if (editor.clickHandler) {
//     editor.tiptap.view.dom.removeEventListener("click", editor.clickHandler);
//   }
//   editor.tiptap.destroy();
//   editor.tiptap = null;
//   editor.clickHandler = null;
//   unregisterEditor(editor.app, editor.id);
// }

// function focusEditor(editor: TiptapEditorView) {
//   if (!editor.tiptap) {
//     console.warn("Editor not mounted, cannot focus");
//     return;
//   }
//   editor.tiptap.view.focus();
// }

// async function undo(editor: TiptapEditorView) {
//   const { app } = editor;
//   if (app.undoStack.length === 0) return;
//   const lastTx = app.undoStack.pop()!;

//   // 撤销前，将当前的选区信息记录到 afterSelection
//   const afterSelection = getSelectionInfo(editor);
//   lastTx.afterSelection = afterSelection ?? undefined;

//   const id2Tmp: Record<BlockId, BlockId> = {};
//   const mapId = (id: BlockId) => id2Tmp[id] ?? app.idMapping[id] ?? id;
//   const { idMapping: tmp2newId } = await withTx(app, (tx) => {
//     for (let i = lastTx.executedOps.length - 1; i >= 0; i--) {
//       const op = lastTx.executedOps[i];
//       if (op.type === "block:create") {
//         const blockId = mapId(op.blockId);
//         tx.deleteBlock(blockId);
//       } else if (op.type === "block:delete") {
//         const oldParentId = op.oldParent ? mapId(op.oldParent) : null;
//         const newBlockId = tx.createBlockUnder(oldParentId, op.oldIndex, {
//           type: op.oldData.type,
//           folded: op.oldData.folded,
//           content: op.oldData.content,
//         });
//         id2Tmp[op.blockId] = newBlockId;
//       } else if (op.type === "block:move") {
//         const targetId = mapId(op.blockId);
//         const parentId = op.oldParent ? mapId(op.oldParent) : null;
//         tx.moveBlock(targetId, parentId, op.oldIndex);
//       } else if (op.type === "block:update") {
//         const blockId = mapId(op.blockId);
//         tx.updateBlock(blockId, op.oldData);
//       }
//     }

//     // 撤销时，需要恢复到撤销前的选区状态
//     if (lastTx.beforeSelection) {
//       const sel = lastTx.beforeSelection;
//       const mappedSel = {
//         ...sel,
//         blockId: mapId(sel.blockId),
//       };
//       tx.setSelection(mappedSel);
//     }
//     tx.setOrigin("undoRedo");
//   });

//   for (const [oldId, tmpId] of Object.entries(id2Tmp)) {
//     const newId = tmp2newId[tmpId];
//     app.idMapping[oldId as BlockId] = newId;
//   }

//   app.redoStack.push(lastTx);
// }

// export function canUndo(editor: TiptapEditorView) {
//   return editor.app.undoStack.length > 0;
// }

// export function canRedo(editor: TiptapEditorView) {
//   return editor.app.redoStack.length > 0;
// }

// async function redo(editor: TiptapEditorView) {
//   const { app } = editor;
//   if (app.undoStack.length === 0) return;
//   const lastTx = app.redoStack.pop()!;

//   const id2Tmp: Record<BlockId, BlockId> = {};
//   const mapId = (id: BlockId) => id2Tmp[id] ?? app.idMapping[id] ?? id;
//   const { idMapping: tmp2newId } = await withTx(app, (tx) => {
//     for (const op of lastTx.executedOps) {
//       if (op.type === "block:create") {
//         const parentId = op.parent ? mapId(op.parent) : null;
//         const newBlockId = tx.createBlockUnder(parentId, op.index, {
//           type: op.data.type,
//           folded: op.data.folded,
//           content: op.data.content,
//         });
//         id2Tmp[op.blockId] = newBlockId;
//       } else if (op.type === "block:delete") {
//         const blockId = mapId(op.blockId);
//         tx.deleteBlock(blockId);
//       } else if (op.type === "block:move") {
//         const targetId = mapId(op.blockId);
//         const parentId = op.parent ? mapId(op.parent) : null;
//         tx.moveBlock(targetId, parentId, op.index);
//       } else if (op.type === "block:update") {
//         const blockId = mapId(op.blockId);
//         tx.updateBlock(blockId, op.newData);
//       }
//     }

//     // 重做时，需要恢复到重做后的选区状态
//     if (lastTx.afterSelection) {
//       const sel = lastTx.afterSelection;
//       const mappedSel = {
//         ...sel,
//         blockId: mapId(sel.blockId),
//       };
//       tx.setSelection(mappedSel);
//     }
//     tx.setOrigin("undoRedo");
//   });

//   for (const [oldId, tmpId] of Object.entries(id2Tmp)) {
//     const newId = tmp2newId[tmpId];
//     app.idMapping[oldId as BlockId] = newId;
//   }

//   app.undoStack.push(lastTx);
// }

// export const editorUtils = {
//   createEditor,
//   getFocusedBlockId,
//   mount: mount,
//   unmount,
//   getSelectionInfo,
//   locateBlock,
//   setRootBlockIds,
//   isFocused,
//   coordAtPos,
//   focusEditor,
//   canUndo,
//   canRedo,
//   undo,
//   redo,
//   pluginFns,
//   nodeViewFns,
//   withDefaults,
// };
