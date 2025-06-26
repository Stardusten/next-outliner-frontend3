import { outlinerSchema } from "@/lib/editor/schema";
import type { BlockId } from "@/lib/common/types";
import type { Node as ProseMirrorNode } from "prosemirror-model";

export function uint8ArrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array));
}

export function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(
    atob(base64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
}

/**
 * 从一个块的 ProseMirror 节点中获取所有块引用
 */
export function getBlockRefs(node: ProseMirrorNode): BlockId[] {
  const res: BlockId[] = [];
  node.descendants((node) => {
    if (node.type === outlinerSchema.nodes.blockRef) {
      const blockId = node.attrs.blockId;
      blockId && res.push(blockId);
    }
  });
  return res;
}
