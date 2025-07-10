import type { App } from "@/lib/app/app";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { EditorView, NodeView } from "prosemirror-view";
import { outlinerSchema } from "../schema";
import { fileExpanded } from "./file/componnets/expanded";
import { fileInline } from "./file/componnets/inline";
import { filePreview } from "./file/componnets/preview/preview";

export function createFileNodeViewClass(app: App) {
  return class implements NodeView {
    dom: HTMLElement;

    constructor(
      node: ProseMirrorNode,
      view: EditorView,
      getPos: any // TODO
    ) {
      if (node.type !== outlinerSchema.nodes.file) {
        throw new Error("impossible. file nodeview get a node" + node);
      }

      const { displayMode } = node.attrs;
      if (displayMode === "expanded") {
        this.dom = fileExpanded(app, view, node, getPos);
      } else if (displayMode === "preview") {
        this.dom = filePreview(app, view, node, getPos);
      } else {
        this.dom = fileInline(app, view, node, getPos);
      }
    }
  };
}
