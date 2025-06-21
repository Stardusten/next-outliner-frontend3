import type { Block, BlockId } from "../../blocks/types";
import { sortChildren, toBlock } from "../../blocks/utils";
import { Observable } from "../../reactivity/observable";
import { BaseBlockStorage } from "./base-impl";

const BLOCK_INDEX_KEY = "pm-block-index";
const BLOCK_KEY_PREFIX = "pm-block-";

function getBlockKey(id: BlockId): string {
  return `${BLOCK_KEY_PREFIX}${id}`;
}

export class LocalStorageBlockStorage extends BaseBlockStorage {
  constructor(initBlocks: Block[] = []) {
    super([]); // 传空数组，因为我们要从 localStorage 加载

    this._loadFromStorage();
    this._listenBlockStorageEvents();

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
          })
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

  private _listenBlockStorageEvents(): void {
    this.addEventListener((events) => {
      for (const event of events) {
        if (event.type === "tx-committed") {
          for (const op of event.result.ops) {
            if (op.type === "add") {
              this._saveBlockToStorage(toBlock(op.block));
              this._saveIndexToStorage();
            } else if (op.type === "update") {
              this._saveBlockToStorage(toBlock(op.newBlock));
            } else if (op.type === "delete") {
              const deleted = op.deletedBlock.get();
              this._deleteBlockFromStorage(deleted.id);
              this._saveIndexToStorage();
            }
          }
        }
      }
    });
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
          })
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
}
