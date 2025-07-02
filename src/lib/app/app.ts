import { InRefsManager } from "@/lib/app/index/in-refs";
import { TextContentManager } from "@/lib/app/index/text-content";
import { LoroDoc, LoroTree, VersionVector, type Frontiers } from "loro-crdt";
import mitt, { type Emitter } from "mitt";
import type {
  BlockData,
  BlockDataInner,
  BlockId,
  BlockNode,
  BlocksVersion,
  TxOrigin,
} from "../common/types";
import { Compacter } from "./compacter";
import { LoroEventTransformer } from "./loro-event-transformer";
import type { Persistence } from "../persistence/persistence";
import { Saver } from "./saver";
import { TransactionManager } from "./tx";
import { UpdateCounter } from "./update-counter";
import { FullTextIndex } from "./index/fulltext";
import type { AttachmentStorage } from "./attachment/storage";
import { createEditor, isFocused, type Editor } from "../editor/editor";
import { nanoid } from "nanoid";

export type BlockChange =
  | {
      type: "block:create";
      blockId: BlockId;
      parent: BlockId | null;
      index: number;
      data: BlockDataInner;
    }
  | {
      type: "block:delete";
      blockId: BlockId;
      oldData: BlockDataInner;
      oldParent: BlockId | null;
      oldIndex: number;
    }
  | {
      type: "block:move";
      blockId: BlockId;
      parent: BlockId | null;
      index: number;
      oldParent: BlockId | null;
      oldIndex: number;
    }
  | {
      type: "block:update";
      blockId: BlockId;
      newData: BlockDataInner;
      oldData: BlockDataInner;
    };

export type AppEvents = {
  "tx-committed": {
    origin: TxOrigin;
    changes: BlockChange[];
  };
  save: {};
  compact: {};
};

export type EditorId = string;

const PM_EDITOR_ID_PREFIX = "prosemirror-editor";

export class App {
  _doc: LoroDoc;
  _tree: LoroTree;
  persistence: Persistence;
  attachmentStorage: AttachmentStorage | null;
  docId: string;

  _eb: Emitter<AppEvents>;
  _emit: Emitter<AppEvents>["emit"];
  on: Emitter<AppEvents>["on"];
  off: Emitter<AppEvents>["off"];

  // private tracked: Map<BlockId, ReactiveBlock> = new Map();

  _inRefsManager: InRefsManager;
  getInRefs: InRefsManager["getInRefs"];

  _fulltextIndex: FullTextIndex;
  search: FullTextIndex["search"];
  searchWithScore: FullTextIndex["searchWithScore"];

  _textContentManager: TextContentManager;
  getTextContent: TextContentManager["getTextContent"];
  getTextContentReactive: TextContentManager["getTextContentReactive"];

  _saver: Saver;
  _compacter: Compacter;
  updateCounter: UpdateCounter;

  _loroEventTransformer: LoroEventTransformer;

  _txManager: TransactionManager;
  tx: TransactionManager["tx"];

  editor: Record<EditorId, Editor> = {};
  lastFocusedEditorId: EditorId | null = null;

  constructor(params: {
    docId: string;
    persistence: Persistence;
    attachmentStorage: AttachmentStorage | null;
  }) {
    const { docId, persistence, attachmentStorage } = params;

    this.docId = docId;
    this.attachmentStorage = attachmentStorage;

    // 初始化事件总线
    this._eb = mitt<AppEvents>();
    this._emit = this._eb.emit.bind(this._eb);
    this.on = this._eb.on.bind(this._eb);
    this.off = this._eb.off.bind(this._eb);

    // 初始化持久化层，并从存储加载数据
    this.persistence = persistence;
    const [doc, tree] = this.persistence.load();
    this._doc = doc;
    this._tree = tree;

    // 初始化引用管理器
    this._inRefsManager = new InRefsManager(this);
    this.getInRefs = this._inRefsManager.getInRefs.bind(this._inRefsManager);
    this._inRefsManager.refreshInRefs(); // 立即刷新引用

    // 初始化块内容管理器
    this._textContentManager = new TextContentManager(this);
    this.getTextContent = this._textContentManager.getTextContent.bind(
      this._textContentManager
    );
    this.getTextContentReactive =
      this._textContentManager.getTextContentReactive.bind(
        this._textContentManager
      );

    // 初始化全文搜索索引
    this._fulltextIndex = new FullTextIndex(this);
    this.search = this._fulltextIndex.search.bind(this._fulltextIndex);
    this.searchWithScore = this._fulltextIndex.searchWithScore.bind(
      this._fulltextIndex
    );

    // 初始化更新计数器
    this.updateCounter = new UpdateCounter();
    const stat = this.persistence.getStorageStats(this.docId);
    this.updateCounter.set(stat.updatesCount);

    // 初始化 saver 和 compacter
    this._saver = new Saver(this);
    this._compacter = new Compacter(this, this._saver);

    // 初始化 loro 事件转换器
    this._loroEventTransformer = new LoroEventTransformer(this);
    this._loroEventTransformer.start();

    // 初始化事务管理器
    this._txManager = new TransactionManager(this);
    this.tx = this._txManager.tx.bind(this._txManager);
  }

  getEditor(editorId: EditorId, rootBlockIds?: BlockId[]): Editor {
    const editor = this.editor[editorId];
    if (editor) return editor;
    else {
      const id = `${PM_EDITOR_ID_PREFIX}-${nanoid()}`;
      const newEditor = createEditor(this, id, rootBlockIds);
      this.editor[id] = newEditor;

      // 监听编辑器聚焦事件，更新 lastFocusedEditorId
      newEditor.on("focus", () => {
        this.lastFocusedEditorId = newEditor.id;
      });

      return newEditor;
    }
  }

  getLastFocusedEditor(): Editor | null {
    return this.lastFocusedEditorId
      ? this.editor[this.lastFocusedEditorId]
      : null;
  }

  getFocusedEditor(): Editor | null {
    const lastFocused = this.lastFocusedEditorId
      ? this.editor[this.lastFocusedEditorId]
      : null;
    if (!lastFocused) return null;
    return isFocused(lastFocused) ? lastFocused : null;
  }

  getRootBlockNodes(): BlockNode[] {
    return this._tree.roots();
  }

  getRootBlockIds(): BlockId[] {
    return this._tree.roots().map((node) => node.id);
  }

  /**
   * 根据 ID 获取块节点
   * @param id 块 ID
   * @param allowDeleted 是否允许获取已删除的块
   */
  getBlockNode(
    id: BlockId,
    allowDeleted = false,
    vv?: Frontiers
  ): BlockNode | null {
    if (vv) {
      try {
        this._doc.checkout(vv);
        const node = this._tree.getNodeByID(id);
        if (!node || (!allowDeleted && node.isDeleted())) return null;
        return node;
      } finally {
        this._doc.checkoutToLatest();
      }
    } else {
      const node = this._tree.getNodeByID(id);
      if (!node || (!allowDeleted && node.isDeleted())) return null;
      return node;
    }
  }

  /**
   * 获取从根块到指定块的完整路径
   * @param blockId 目标块的 ID
   * @returns 返回从根块到目标块的完整路径数组，包含目标块本身。
   * 数组顺序是从根块开始，到目标块结束。如果块不存在则返回 null。
   * 例如: [rootId, parent2Id, parent1Id, blockId]
   */
  getBlockPath(blockId: BlockId): BlockId[] | null {
    const targetNode = this.getBlockNode(blockId);
    if (!targetNode) return null;

    // 从目标块向上遍历，收集所有祖先块的 ID
    const path: BlockId[] = [blockId];
    let curr = targetNode.parent();

    while (curr != null) {
      path.unshift(curr.id);
      curr = curr.parent();
    }

    return path;
  }

  getBlockDataMap(
    id: BlockId,
    allowDeleted = false,
    vv?: Frontiers
  ): BlockData | null {
    const node = this.getBlockNode(id, allowDeleted, vv);
    if (!node) return null;
    return node.data as BlockData;
  }

  getBlockData(
    id: BlockId,
    allowDeleted = false,
    vv?: Frontiers
  ): BlockDataInner | null {
    const node = this.getBlockNode(id, allowDeleted, vv);
    if (!node) return null;
    return node.data.toJSON() as BlockDataInner;
  }

  /**
   * 获取当前版本
   */
  getCurrentVersion(): BlocksVersion {
    return this._doc.version();
  }

  exportSnapshot(): Uint8Array {
    return this._doc.export({ mode: "update" });
  }

  exportShallowSnapshot(): Uint8Array {
    return this._doc.export({
      mode: "shallow-snapshot",
      frontiers: this._doc.frontiers(),
    });
  }

  exportUpdateFrom(vv: VersionVector): Uint8Array {
    return this._doc.export({ mode: "update", from: vv });
  }

  getAllNodes(withDeleted = false): BlockNode[] {
    return this._tree.getNodes({ withDeleted });
  }

  /**
   * 释放内部资源，停止保存/压缩定时器
   */
  destroy(): void {
    try {
      this._saver.stop();
      this._compacter.stop();
    } catch (e) {
      console.warn("Error during App.destroy", e);
    }
    // 清理事件监听
    this.off && this.off("tx-committed", () => {});
  }
}
