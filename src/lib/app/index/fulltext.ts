// @ts-ignore
import Document from "@/../node_modules/flexsearch/dist/module/document";
import { calcMatchScore, hybridTokenize } from "./tokenize";
import type { BlockId, BlockNode } from "@/lib/common/types";
import type { App } from "../app";
import { getAllNodes, getBlockNode } from "../block-manage";
import { getTextContent } from "./text-content";

export type FullTextIndexConfig = {
  /** 是否忽略注音符号 */
  ignoreDiacritics: boolean;
};

/**
 * 初始化全文索引
 */
export function initFullTextIndex(app: App, config?: FullTextIndexConfig) {
  app.dirtySet = new Set();
  app.fulltextConfig = {
    ignoreDiacritics: config?.ignoreDiacritics ?? true,
  };

  // 初始化 flexsearch 实例
  app.flexsearch = new Document({
    document: {
      id: "id",
      index: "textContent",
      store: ["textContent"],
    },
    encode: (str: string) => {
      const tokens = hybridTokenize(str, {
        removeDiacritics: app.fulltextConfig.ignoreDiacritics,
      });
      return tokens;
    },
  });

  // 先初始化索引
  for (const blockNode of getAllNodes(app)) {
    const blockId = blockNode.id;
    updateIndexOfBlock(app, blockId, blockNode);
  }

  // 监听事务提交事件
  app.on("tx-committed", (event) => {
    for (const change of event.executedOps) {
      let blockId: BlockId;
      switch (change.type) {
        case "block:create":
          blockId = change.blockId;
          app.dirtySet.add(blockId);
          break;
        case "block:update":
          blockId = change.blockId;
          app.dirtySet.add(blockId);
          break;
        case "block:delete":
          blockId = change.blockId;
          app.dirtySet.add(blockId);
          break;
      }
    }
  });
}

/**
 * 搜索块，返回块 ID 数组
 */
export function searchBlocks(
  app: App,
  query: string,
  limit: number = 200
): BlockId[] {
  updateIndexOfAllDirtyBlocks(app); // 先更新索引

  // flexsearch 可能返回 undefined，需要安全处理
  const searchResult = app.flexsearch.search(query, { limit, enrich: true });
  const results = searchResult?.[0]?.result;
  if (!results) return [];

  const queryTokens = hybridTokenize(query, {
    caseSensitive: false,
    cjkNGram: 1,
    includePrefix: false,
    removeDiacritics: app.fulltextConfig.ignoreDiacritics,
  });

  const idAndScores = results.map((result: any) => {
    const score = calcMatchScore(queryTokens, result.doc.textContent);
    return { id: result.id, score };
  });

  idAndScores.sort((a: any, b: any) => b.score - a.score);
  return idAndScores.map((item: any) => item.id);
}

/**
 * 搜索块，返回带分数的结果
 */
export function searchBlocksWithScore(
  app: App,
  query: string,
  limit: number = 200
): { id: BlockId; score: number }[] {
  updateIndexOfAllDirtyBlocks(app); // 先更新索引

  // flexsearch 可能返回 undefined，需要安全处理
  const searchResult = app.flexsearch.search(query, { limit, enrich: true });
  const results = searchResult?.[0]?.result;
  if (!results) return [];

  const queryTokens = hybridTokenize(query, {
    caseSensitive: false,
    cjkNGram: 1,
    includePrefix: false,
    removeDiacritics: app.fulltextConfig.ignoreDiacritics,
  });

  const idAndScores = results.map((result: any) => {
    const score = calcMatchScore(queryTokens, result.doc.textContent);
    return { id: result.id, score };
  });

  idAndScores.sort((a: any, b: any) => b.score - a.score);
  return idAndScores;
}

/**
 * 更新单个块的索引
 */
function updateIndexOfBlock(
  app: App,
  blockId: BlockId,
  block: BlockNode | null
) {
  // 这个块被删除了，也从索引中删除
  if (block == null && app.flexsearch.contain(blockId)) {
    app.flexsearch.remove(blockId);
  } else if (block) {
    // 先删除旧索引项
    if (app.flexsearch.contain(blockId)) {
      app.flexsearch.remove(blockId);
    }
    // 然后添加最新的索引项
    const textContent = getTextContent(app, blockId);
    app.flexsearch.add(blockId, {
      id: blockId,
      textContent,
    });
  }
}

/**
 * 更新所有脏块的索引
 */
function updateIndexOfAllDirtyBlocks(app: App) {
  // 没有要更新的块
  if (app.dirtySet.size === 0) return;

  for (const blockId of app.dirtySet) {
    const block = getBlockNode(app, blockId);
    updateIndexOfBlock(app, blockId, block);
  }
  // 清空 dirtySet
  app.dirtySet.clear();
}
