import type { Block, BlockLoaded } from "./types";

export function sortChildren(block: BlockLoaded) {
  block.update((val) => {
    val.childrenBlocks.sort((a, b) => a.get().fractionalIndex - b.get().fractionalIndex);
  });
}

/**
 * 将 BlockLoaded 转换为可存储的纯 Block 对象
 * @param block - 包含响应式和循环引用的 BlockLoaded 对象
 * @returns 只包含纯数据的 Block 对象
 */
export function toBlock(block: BlockLoaded): Block {
  const { id, type, folded, parentId, fractionalIndex, content, textContent } = block.get();
  return { id, type, folded, parentId, fractionalIndex, content, textContent };
}
