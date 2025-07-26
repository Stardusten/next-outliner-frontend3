import type { EditorView, NodeView } from "prosemirror-view";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { schema } from "../editor";
import type { App } from "@/lib/app/app";
import type { BlockId } from "@/lib/common/types";
import { getTextContentReactive } from "@/lib/app/index/text-content";
import { BlockRef } from "../tiptap-editor/nodes/block-ref";

export function createBlockRefNodeViewClass(app: App) {
  return class implements NodeView {
    dom: HTMLElement;
    unsubscriber: (() => void) | null = null;

    constructor(
      node: ProseMirrorNode,
      view: EditorView,
      getPos: () => number | undefined
    ) {
      if (node.type.name !== BlockRef.name) {
        throw new Error("impossible. block ref nodeview get a node" + node);
      }

      this.dom = document.createElement("span");
      this.dom.classList.add("block-ref");
      if (node.attrs.isTag) {
        this.dom.classList.add("block-tag");
      }
      this.dom.dataset.blockId = node.attrs.blockId as BlockId;
      this.dom.dataset.isTag = node.attrs.isTag;

      const blockId = node.attrs.blockId as BlockId;
      const isTag = node.attrs.isTag;
      const textContent = getTextContentReactive(app, blockId);
      textContent.subscribe(
        (textContent) => {
          this.dom.innerText = isTag ? `#${textContent}` : textContent;
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
