import type { LoroDoc, LoroTree } from "loro-crdt";
import type { Persistence } from "../persistence/persistence";
import type { AttachmentStorage } from "./attachment/storage";
import type { Emitter } from "mitt";
import type { Observable } from "../common/observable";
import type {
  BlockDataInner,
  BlockId,
  BlocksVersion,
  TxOrigin,
} from "../common/types";
import { initFullTextIndex, type FullTextIndexConfig } from "./index/fulltext";
import type { Editor } from "../editor/editor";
import type { AsyncTaskQueue } from "../common/taskQueue";
import type { DebouncedTimer } from "../common/timer/debounced";
import { initInRefs } from "./index/in-refs";
import mitt from "mitt";
import { initTextContent } from "./index/text-content";
import { initSaver } from "./saver";
import { initCompacter } from "./compacter";
import {
  initTransactionManager,
  type TxExecutedOperation,
  type TxMeta,
} from "./tx";
import { initEditors } from "./editors";

export type AppEvents = {
  "tx-committed": {
    executedOps: TxExecutedOperation[];
    meta: TxMeta;
  };
  save: {};
  compact: {};
};

export type EditorId = string;

export type App = {
  doc: LoroDoc;
  docId: string;
  tree: LoroTree;
  persistence: Persistence;
  attachmentStorage: AttachmentStorage | null;

  // 事件总线
  eb: Emitter<AppEvents>;
  emit: Emitter<AppEvents>["emit"];
  on: Emitter<AppEvents>["on"];
  off: Emitter<AppEvents>["off"];
  lastEvent: AppEvents["tx-committed"] | null;

  // 反链管理
  inRefs: Map<BlockId, Observable<Set<BlockId>>>;

  // 全文索引
  flexsearch: any;
  dirtySet: Set<BlockId>;
  fulltextConfig: FullTextIndexConfig;

  // 文本内容管理
  textContentCache: Map<BlockId, string>;
  textContentObs: Map<BlockId, Observable<string>>;

  // 编辑器
  editors: Record<EditorId, Editor>;
  lastFocusedEditorId: EditorId | null;

  // 事务队列
  txQueue: AsyncTaskQueue;

  // 保存
  saverStarted: boolean;
  lastSave: BlocksVersion;
  hasUnsavedChanges: boolean;
  saveTimer: DebouncedTimer;
  saveDelay: number;
  saveMaxDelay: number;

  // 压缩
  compactStarted: boolean;
  compactTimer: DebouncedTimer;
  compactDelay: number;
  compactMaxDelay: number;
  maxUpdatesBeforeCompact: number;

  // 更新计数
  updatesCount: number;

  // thinkingBlockIds
  thinkingBlockIds: Set<BlockId>;
};

export function createApp(
  docId: string,
  persistence: Persistence,
  attachmentStorage: AttachmentStorage | null
): App {
  const app = {
    docId,
    persistence,
    attachmentStorage,
  } as App;

  initEb(app);
  initInRefs(app);
  initDocAndTree(app);
  initInRefs(app);
  initTextContent(app);
  initFullTextIndex(app);
  initUpdatesCounts(app);
  initSaver(app);
  initCompacter(app);
  initTransactionManager(app);
  initEditors(app);

  return app;
}

export function destroyApp(app: App) {
  // TODO
}

function initEb(app: App) {
  app.eb = mitt();
  app.emit = app.eb.emit;
  app.on = app.eb.on;
  app.off = app.eb.off;
}

function initDocAndTree(app: App) {
  const [doc, tree] = app.persistence.load();
  app.doc = doc;
  app.tree = tree;
}

function initUpdatesCounts(app: App) {
  const stat = app.persistence.getStorageStats(app.docId);
  app.updatesCount = stat.updatesCount;
}
