import type { BlockStorage } from "@/lib/storage/interface";
import type { EditorView, NodeView } from "prosemirror-view";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { outlinerSchema } from "../schema";
import type { BlockId } from "@/lib/blocks/types";

export function createBlockRefNodeViewClass(storage: BlockStorage) {
  return class implements NodeView {
    dom: HTMLElement;
    unsubscriber: (() => void) | null = null;

    constructor(node: ProseMirrorNode, view: EditorView, getPos: () => number | undefined) {
      if (node.type !== outlinerSchema.nodes.blockRef) {
        throw new Error("impossible. block ref nodeview get a node" + node);
      }

      this.dom = document.createElement("span");
      this.dom.classList.add("block-ref");
      this.dom.dataset.blockId = node.attrs.blockId as BlockId;

      const blockId = node.attrs.blockId as BlockId;
      const block = storage.getBlock(blockId);

      if (block) {
        this.unsubscriber = block.subscribe(
          (b) => {
            this.dom.innerText = b.textContent;
          },
          { immediate: true },
        );
      }
    }

    destroy() {
      if (this.unsubscriber) {
        this.unsubscriber();
        this.unsubscriber = null;
      }
    }
  };
}
