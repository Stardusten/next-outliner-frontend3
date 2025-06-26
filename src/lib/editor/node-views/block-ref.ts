import type { EditorView, NodeView } from "prosemirror-view";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { outlinerSchema } from "../schema";
import type { App } from "@/lib/app/app";
import type { BlockId } from "@/lib/common/types";

export function createBlockRefNodeViewClass(app: App) {
  return class implements NodeView {
    dom: HTMLElement;
    unsubscriber: (() => void) | null = null;

    constructor(
      node: ProseMirrorNode,
      view: EditorView,
      getPos: () => number | undefined
    ) {
      if (node.type !== outlinerSchema.nodes.blockRef) {
        throw new Error("impossible. block ref nodeview get a node" + node);
      }

      this.dom = document.createElement("span");
      this.dom.classList.add("block-ref");
      this.dom.dataset.blockId = node.attrs.blockId as BlockId;

      const blockId = node.attrs.blockId as BlockId;
      const textContent = app.getTextContentReactive(blockId);
      textContent.subscribe(
        (textContent) => {
          this.dom.innerText = textContent;
        },
        { immediate: true }
      );
    }

    destroy() {
      if (this.unsubscriber) {
        this.unsubscriber();
        this.unsubscriber = null;
      }
    }
  };
}
