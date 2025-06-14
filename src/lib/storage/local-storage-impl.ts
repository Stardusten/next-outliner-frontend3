import type { Block, BlockId, BlockLoaded } from "../blocks/types";
import { sortChildren, toBlock } from "../blocks/utils";
import { Observable } from "../reactivity/observable";
import { BaseBlockStorage } from "./base-impl";
import type { AddBlockParams, EventMetadata, UpdateBlockParams, UpdateSource } from "./interface";

const BLOCK_INDEX_KEY = "pm-block-index";
const BLOCK_KEY_PREFIX = "pm-block-";

function getBlockKey(id: BlockId): string {
  return `${BLOCK_KEY_PREFIX}${id}`;
}

export class LocalStorageBlockStorage extends BaseBlockStorage {
  constructor(initBlocks: Block[] = []) {
    super([]); // 传空数组，因为我们要从 localStorage 加载

    this._loadFromStorage();

    // 如果 localStorage 为空且提供了初始块，则用初始块填充
    if (this.blocks.size === 0 && initBlocks.length > 0) {
      const blockIds: BlockId[] = [];
      for (const block of initBlocks) {
        blockIds.push(block.id);
        this.blocks.set(
          block.id,
          new Observable<any>({
            ...block,
            parentBlock: null,
            childrenBlocks: [],
          }),
        );
      }
      this._saveIndexToStorage(blockIds);
      for (const block of this.blocks.values()) {
        this._saveBlockToStorage(toBlock(block));
      }
    }

    // 链接父子关系
    for (const blockLoaded of this.blocks.values()) {
      const blockData = blockLoaded.get();
      if (blockData.parentId) {
        const parentBlock = this.blocks.get(blockData.parentId);
        if (parentBlock) {
          blockLoaded.update((val) => (val.parentBlock = parentBlock));
          parentBlock.update((val) => val.childrenBlocks.push(blockLoaded));
        }
      }
    }

    for (const blockLoaded of this.blocks.values()) {
      sortChildren(blockLoaded);
    }
  }

  private _loadFromStorage(): void {
    const indexJson = localStorage.getItem(BLOCK_INDEX_KEY);
    if (!indexJson) return;

    const blockIds = JSON.parse(indexJson) as BlockId[];
    for (const id of blockIds) {
      const blockJson = localStorage.getItem(getBlockKey(id));
      if (blockJson) {
        const block = JSON.parse(blockJson) as Block;
        this.blocks.set(
          id,
          new Observable<any>({
            ...block,
            parentBlock: null,
            childrenBlocks: [],
          }),
        );
      }
    }
  }

  private _saveBlockToStorage(block: Block): void {
    localStorage.setItem(getBlockKey(block.id), JSON.stringify(block));
  }

  private _deleteBlockFromStorage(id: BlockId): void {
    localStorage.removeItem(getBlockKey(id));
  }

  private _saveIndexToStorage(ids?: BlockId[]): void {
    const blockIds = ids ?? Array.from(this.blocks.keys());
    localStorage.setItem(BLOCK_INDEX_KEY, JSON.stringify(blockIds));
  }

  addBlock(params: AddBlockParams, source?: UpdateSource, metadata?: EventMetadata): void {
    super.addBlock(params, source, metadata);
    this._saveBlockToStorage(params);
    this._saveIndexToStorage();
  }

  updateBlock(
    id: BlockId,
    params: UpdateBlockParams,
    source?: UpdateSource,
    metadata?: EventMetadata,
  ): void {
    super.updateBlock(id, params, source, metadata);
    const block = this.getBlock(id);
    if (block) {
      this._saveBlockToStorage(toBlock(block));
    }
  }

  deleteBlock(id: BlockId, source?: UpdateSource, metadata?: EventMetadata): void {
    super.deleteBlock(id, source, metadata);
    this._deleteBlockFromStorage(id);
    this._saveIndexToStorage();
  }

  clear(source?: UpdateSource): void {
    super.clear(source);
    localStorage.clear();
  }
}
