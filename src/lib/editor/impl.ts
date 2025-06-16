import { nanoid } from "nanoid";
import { inputRules } from "prosemirror-inputrules";
import { imeSpan } from "prosemirror-safari-ime-span";
import {
  EditorState as ProseMirrorState,
  Transaction as ProseMirrorTransaction,
  TextSelection,
} from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import type { BlockId } from "../blocks/types";
import type {
  BlockStorage,
  BlockStorageEvent,
  BlockStorageEventBatch,
} from "../storage/interface";
import { findCurrListItem, toggleFocusedFoldState } from "./commands";
import { toCodeblock } from "./input-rules/to-codeblock";
import type {
  Editor,
  EditorConfig,
  EditorEvent,
  EventListener,
} from "./interface";
import { createKeymapPlugin } from "./keymap";
import { createBlockRefNodeViewClass } from "./node-views/block-ref";
import {
  createCompletionHelperPlugin as createBlockRefCompletionPlugin,
  executeCompletion,
} from "./plugins/block-ref-completion";
import { createHighlightCodeblockPlugin } from "./plugins/highlight-codeblock";
import { createPastePlugin } from "./plugins/paste-text";
import { outlinerSchema } from "./schema";
import {
  createStateFromStorage,
  findListItemAtPos,
  getAbsPos,
  getBlockPath,
  normalizeSelection,
  serialize,
  toMarkdown,
} from "./utils";
import { createListItemNodeViewClass } from "./node-views/list-item";
import { UpdateSources } from "./update-source";

const PM_EDITOR_ID_PREFIX = "prosemirror-editor";
const STORAGE_SYNC_META_KEY = "fromStorage";

/**
 * ProseMirror 大纲编辑器实现
 */
export class ProseMirrorEditor implements Editor {
  // 编辑器实例的唯一标识符
  readonly id: string;
  private view?: EditorView;
  private rootBlockIds: BlockId[];
  private storage: BlockStorage;
  private listeners: EventListener[] = [];
  private storageListener: (events: BlockStorageEventBatch) => void;
  // 是否启用自动保存
  private autoSave: boolean;

  /**
   * @param storage - 块存储实例，用于数据持久化和同步
   * @param config - 编辑器配置选项
   */
  constructor(storage: BlockStorage, config?: EditorConfig) {
    this.id = `${PM_EDITOR_ID_PREFIX}-${nanoid()}`;
    this.storage = storage;
    this.autoSave = config?.autoSave ?? true;
    this.rootBlockIds = config?.initialRootBlockIds ?? [];

    // 监听存储事件，更新视图
    this.storageListener = (events: BlockStorageEventBatch) => {
      if (!this.view) return;

      // 检查是否有需要处理的事件（过滤掉来自当前编辑器实例的事件）
      const relevantEvents = events.filter(
        (event) => event.source !== UpdateSources.localEditorContent(this.id)
      );
      if (relevantEvents.length === 0) return;

      // 获取最后一个带有选区信息的事件，作为恢复目标
      let selectionToRestore: { blockId: BlockId; offset: number } | null =
        null;

      // 从后往前查找第一个包含选区信息的事件
      for (let i = relevantEvents.length - 1; i >= 0; i--) {
        const event = relevantEvents[i];
        if (event.metadata?.selection) {
          selectionToRestore = event.metadata.selection;
          break;
        }
      }

      // 如果没有找到指定的选区，则保存当前选区作为回退
      if (!selectionToRestore) {
        const { selection } = this.view.state;
        const listItemInfo = findCurrListItem(this.view.state);
        if (listItemInfo && listItemInfo.node.attrs.blockId) {
          selectionToRestore = {
            blockId: listItemInfo.node.attrs.blockId,
            offset: selection.from - (listItemInfo.pos + 2),
          };
        }
      }

      // 只进行一次视图更新，处理所有相关事件
      const newDoc = createStateFromStorage(this.storage, this.rootBlockIds);
      const state = this.view.state;
      const tr = state.tr.replaceWith(0, state.doc.content.size, newDoc);

      // 尝试恢复选区
      if (selectionToRestore) {
        const newPos = getAbsPos(
          tr.doc,
          selectionToRestore.blockId,
          selectionToRestore.offset
        );
        if (newPos !== null) {
          tr.setSelection(TextSelection.create(tr.doc, newPos));
        }
      }

      // 标记此事务来自外部存储同步，防止 dispatchTransaction 中再次触发同步
      tr.setMeta(STORAGE_SYNC_META_KEY, true);
      this.view.dispatch(tr);
    };
    this.storage.addEventListener(this.storageListener);
  }

  /**
   * 将编辑器挂载到指定的 DOM 元素
   *
   * @param dom - 要挂载编辑器的 HTML 元素
   * @throws {Error} 如果 DOM 元素无效
   */
  mount(dom: HTMLElement): void {
    if (this.view) {
      this.unmount();
    }
    const doc = createStateFromStorage(this.storage, this.rootBlockIds);

    // 构建插件列表
    const plugins = [
      // 用于块引用补全
      // 注意必须放到 keymapPlugin 前面，否则 handleKeydown
      // 将无法捕获到被 keymapPlugin 处理的事件
      createBlockRefCompletionPlugin(this.emit.bind(this)),
      inputRules({ rules: [toCodeblock] }),
      createKeymapPlugin(this.storage),
      createHighlightCodeblockPlugin(),
      imeSpan, // imeSpan 用于修复 Safari 下一些奇怪的问题
      createPastePlugin(this.storage),
      // pasteLinkPlugin, // 用于粘贴链接
      // pasteBlockRefPlugin, // 用于粘贴块引用
    ];

    const state = ProseMirrorState.create({
      schema: outlinerSchema,
      plugins,
      doc,
    });

    const storage = this.storage;
    this.view = new EditorView(dom, {
      state,
      nodeViews: {
        blockRef(node, view, getPos) {
          const clz = createBlockRefNodeViewClass(storage);
          return new clz(node, view, getPos);
        },
        listItem(node, view, getPos) {
          const clz = createListItemNodeViewClass(storage);
          return new clz(node, view, getPos);
        },
      },
      dispatchTransaction: (transaction: ProseMirrorTransaction) => {
        if (!this.view) return;

        // 立即应用事务
        transaction = normalizeSelection(transaction); // 先规范化选区
        const newState = this.view.state.apply(transaction);
        this.view.updateState(newState);

        // 如果文档内容被用户修改，则将变更同步回数据库
        // 通过检查 meta key 来避免同步由 storageListener 触发的变更
        if (
          transaction.docChanged &&
          !transaction.getMeta(STORAGE_SYNC_META_KEY)
        ) {
          this.syncContentChangesToStorage(transaction);
        }
      },
    });

    this.view.dom.addEventListener(
      "click",
      this.handleListItemClick.bind(this)
    );
  }

  getFocusedBlockId(): BlockId | null {
    if (!this.view) return null;
    const listItemInfo = findCurrListItem(this.view.state);
    if (listItemInfo && listItemInfo.node.attrs.blockId) {
      return listItemInfo.node.attrs.blockId;
    }
    return null;
  }

  private handleListItemClick(e: MouseEvent) {
    let tgt = e.target;

    // 点击块引用
    if (tgt instanceof HTMLSpanElement && tgt.classList.contains("block-ref")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const tgtBlockId = tgt.dataset.blockId;
      if (tgtBlockId != null) {
        this.locateBlock(tgtBlockId);
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
        const { state, dispatch } = this.view!;
        toggleFocusedFoldState(
          this.storage,
          undefined,
          clickedBlockId
        )(state, dispatch);
      } else if (clickedBullet) {
        // 点击 bullet 时，聚焦到这个块（设置为根块）
        e.preventDefault();
        e.stopImmediatePropagation();
        this.setRootBlocks([clickedBlockId]);
      }
    }
  }

  /**
   * 卸载编辑器，清理 ProseMirror 视图
   *
   * 调用此方法后，编辑器将不再响应用户交互，但状态数据保持不变
   */
  unmount(): void {
    if (this.view) {
      this.view.dom.removeEventListener(
        "click",
        this.handleListItemClick.bind(this)
      );
      this.view.destroy();
      this.view = undefined;
    }
  }

  /**
   * 指定根块列表
   *
   * @param blockIds - 要指定的根块 ID 列表，传入空数组则显示所有根块
   * @emits root-blocks-changed 事件通知根块指定状态变更
   */
  setRootBlocks(blockIds: BlockId[]): void {
    this.rootBlockIds = blockIds;
    // 触发一次重绘来更新视图
    if (this.view) {
      const newDoc = createStateFromStorage(this.storage, this.rootBlockIds);
      const state = this.view.state;
      const tr = state.tr.replaceWith(0, state.doc.content.size, newDoc);
      tr.setMeta(STORAGE_SYNC_META_KEY, true);
      this.view.dispatch(tr);
    }
    this.emit({ type: "root-blocks-changed", rootBlockIds: blockIds });
  }

  /**
   * 添加事件监听器
   *
   * @param listener - 事件监听回调函数
   */
  addEventListener<T extends EditorEvent>(listener: EventListener<T>): void {
    this.listeners.push(listener as EventListener);
  }

  /**
   * 移除事件监听器
   *
   * @param listener - 要移除的事件监听回调函数
   */
  removeEventListener<T extends EditorEvent>(listener: EventListener<T>): void {
    const index = this.listeners.indexOf(listener as EventListener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 销毁编辑器实例
   *
   * 清理所有资源，包括：
   * - 卸载 ProseMirror 视图
   * - 移除存储事件监听器
   * - 清空编辑器事件监听器
   *
   * 调用此方法后，编辑器实例将不可用
   */
  destroy(): void {
    this.unmount();
    this.storage.removeEventListener(this.storageListener);
    this.listeners = [];
  }

  getMarkdown(): string {
    if (!this.view) return "";
    return toMarkdown(this.view.state.doc);
  }

  coordAtPos(
    pos: number,
    side?: number
  ): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } {
    return this.view!.coordsAtPos(pos, side);
  }

  executeComplete(blockId: BlockId): void {
    executeCompletion(blockId, this.view!);
  }

  emit(event: EditorEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * 定位到一个块，如果这个块当前因为折叠看不到，
   * 会将其所有祖先块中折叠的块全部展开；如果这个
   * 块因为不在当前任何根块所在的子树而看不到，则
   * 调整根块为当前根块与这个块的公共父块，然后将
   * 选区设置为这个块末尾，并且滚动到这个块
   */
  locateBlock(targetBlockId: BlockId): void {
    // 1. 获取目标块的完整路径
    const targetPath = getBlockPath(this.storage, targetBlockId);
    if (!targetPath) {
      return;
    }

    // 2. 展开所有祖先块中折叠的块
    // targetPath 包含目标块本身，所以我们需要排除最后一个元素
    const ancestors = targetPath.slice(0, -1);
    for (const ancestorId of ancestors) {
      const ancestorBlock = this.storage.getBlock(ancestorId);
      if (ancestorBlock && ancestorBlock.get().folded) {
        this.storage.updateBlock(
          ancestorId,
          { folded: false },
          UpdateSources.localEditorStructural
        );
      }
    }

    // 3. 确定根块：找到当前根块与目标块的公共父块
    const currentRoots =
      this.rootBlockIds.length > 0
        ? this.rootBlockIds
        : this.storage.getRootBlocks().map((b) => b.get().id);

    let newRootBlocks: BlockId[] = [];

    if (currentRoots.length === 0 || currentRoots.length > 1) {
      // 如果当前没有根块，显示所有根块
      newRootBlocks = [];
    } else {
      // 寻找公共父块
      let commonAncestor: BlockId | null = null;

      for (const rootId of currentRoots) {
        const rootPath = getBlockPath(this.storage, rootId);
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

    // 4. 设置新的根块
    this.setRootBlocks(newRootBlocks);

    // 5. 等待文档更新后，滚动到目标块然后聚焦
    setTimeout(() => {
      if (!this.view) return;
      const content = this.view.state.doc.content;
      const listItemType = outlinerSchema.nodes.listItem;

      let listItemPos = -1;
      content.forEach((node, pos) => {
        if (listItemPos != -1) return false;
        if (node.type === listItemType) {
          const blockId = node.attrs.blockId;
          if (blockId === targetBlockId) {
            listItemPos = pos;
            return false;
          }
        }
      });

      if (listItemPos != -1) {
        const tr = this.view.state.tr;
        tr.setSelection(TextSelection.create(tr.doc, listItemPos + 2));
        tr.scrollIntoView();
        this.view.dispatch(tr);
        this.view.focus();
      } else {
        console.log("listItem with blockId=" + targetBlockId + " not found");
      }
    });
  }

  private syncContentChangesToStorage(tr: ProseMirrorTransaction) {
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

    // 根据 pos 找出发生变化的块和新的内容
    // 然后更新块存储
    const updatedIds = new Set<BlockId>();
    for (const pos of positions) {
      const listItem = findListItemAtPos(tr.doc, pos);
      if (listItem != null) {
        const blockId = listItem.node.attrs.blockId as BlockId;

        // 如果已经更新过，则跳过，防止重复更新一个块
        if (updatedIds.has(blockId)) continue;
        updatedIds.add(blockId);

        const newData = serialize(listItem.node.firstChild!);
        this.storage.updateBlock(
          blockId,
          newData,
          UpdateSources.localEditorContent(this.id)
        );
      }
    }
  }
}
