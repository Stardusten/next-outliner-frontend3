import type { BlockStorage } from "../storage/interface";
// @ts-ignore
import Document from "@/../node_modules/flexsearch/dist/module/document";
import { calcMatchScore, hybridTokenize } from "./tokenize";
import type { BlockId, BlockLoaded } from "../blocks/types";

export type FullTextIndexConfig = {
  /** 是否忽略注音符号 */
  ignoreDiacritics: boolean;
};

export class FullTextIndex {
  private storage: BlockStorage;
  private flexsearch: any;
  // 用于记录所有 “脏块”，即块内容与索引时不一致的块的 ID
  private dirtySet: Set<BlockId>;
  private config: FullTextIndexConfig;

  constructor(storage: BlockStorage, config?: FullTextIndexConfig) {
    this.storage = storage;
    this.dirtySet = new Set();

    this.config = {
      ignoreDiacritics: config?.ignoreDiacritics ?? true,
    };

    this.flexsearch = new Document({
      document: {
        id: "id",
        index: "textContent",
        store: ["textContent"],
      },
      encode: (str: string) => {
        const tokens = hybridTokenize(str, { removeDiacritics: this.config.ignoreDiacritics });
        return tokens;
      },
    });

    this.initIndex(); // 先初始化索引

    this.storage.addEventListener((e) => {
      const blockId =
        e.type === "block-added" || e.type === "block-updated"
          ? e.newBlock.get().id
          : e.deleted.get().id;
      this.dirtySet.add(blockId);
    });
  }

  private initIndex() {
    this.storage.forEachBlock((b) => {
      const blockId = b.get().id;
      this.updateIndexOfBlock(blockId, b);
      return true;
    });
  }

  private updateIndexOfBlock(blockId: BlockId, block: BlockLoaded | null) {
    // 这个块被删除了，也从索引中删除
    if (block == null && this.flexsearch.contain(blockId)) {
      this.flexsearch.remove(blockId);
    } else if (block) {
      // 先删除旧索引项
      if (this.flexsearch.contain(blockId)) {
        this.flexsearch.remove(blockId);
      }
      // 然后添加最新的索引项
      this.flexsearch.add(blockId, {
        id: blockId,
        textContent: block.get().textContent,
      });
    }
  }

  private updateIndexOfAllDirtyBlocks() {
    // 没有要更新的块
    if (this.dirtySet.size === 0) return;

    for (const blockId of this.dirtySet) {
      const block = this.storage.getBlock(blockId);
      this.updateIndexOfBlock(blockId, block);
    }
    // 清空 dirtySet
    this.dirtySet.clear();
  }

  search(query: string, limit: number = 200): BlockId[] {
    this.updateIndexOfAllDirtyBlocks(); // 先更新索引

    const results = this.flexsearch.search(query, { limit, enrich: true })?.[0]?.result;
    if (!results) return [];

    const queryTokens = hybridTokenize(query, {
      caseSensitive: false,
      cjkNGram: 1,
      includePrefix: false,
      removeDiacritics: this.config.ignoreDiacritics,
    });
    const idAndScores = results.map((result: any) => {
      const score = calcMatchScore(queryTokens, result.doc.textContent);
      return { id: result.id, score };
    });
    idAndScores.sort((a: any, b: any) => b.score - a.score);
    return idAndScores.map((item: any) => item.id);
  }

  searchWithScore(query: string, limit: number = 200): { id: BlockId; score: number }[] {
    this.updateIndexOfAllDirtyBlocks(); // 先更新索引

    const results = this.flexsearch.search(query, { limit, enrich: true })?.[0]?.result;
    if (!results) return [];

    const queryTokens = hybridTokenize(query, {
      caseSensitive: false,
      cjkNGram: 1,
      includePrefix: false,
      removeDiacritics: this.config.ignoreDiacritics,
    });
    const idAndScores = results.map((result: any) => {
      const score = calcMatchScore(queryTokens, result.doc.textContent);
      return { id: result.id, score };
    });
    idAndScores.sort((a: any, b: any) => b.score - a.score);
    return idAndScores;
  }
}
