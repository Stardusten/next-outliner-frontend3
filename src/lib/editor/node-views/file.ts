import type { App } from "@/lib/app/app";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import type {
  Decoration,
  DecorationSource,
  EditorView,
  NodeView,
} from "prosemirror-view";
import { outlinerSchema } from "../schema";
import { fileExpanded } from "./file/componnets/expanded";
import { fileInline } from "./file/componnets/inline";
import { filePreview } from "./file/componnets/preview/preview";

export function createFileNodeViewClass(app: App) {
  return class implements NodeView {
    dom: HTMLElement;
    node: ProseMirrorNode;

    constructor(
      node: ProseMirrorNode,
      view: EditorView,
      getPos: any // TODO
    ) {
      this.node = node;
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

    update(
      newNode: ProseMirrorNode,
      decorations: readonly Decoration[],
      innerDecorations: DecorationSource
    ) {
      // 只有宽度变化时，不重新渲染
      const oldAttrs = this.node.attrs;
      const newAttrs = newNode.attrs;
      const oldExtraInfo = JSON.parse(oldAttrs.extraInfo || "{}");
      const newExtraInfo = JSON.parse(newAttrs.extraInfo || "{}");
      delete oldExtraInfo.width;
      delete newExtraInfo.width;
      const oldAttrsExceptWidth = { ...oldAttrs, extraInfo: oldExtraInfo };
      const newAttrsExceptWidth = { ...newAttrs, extraInfo: newExtraInfo };
      this.node = newNode;
      console.log(oldAttrsExceptWidth, newAttrsExceptWidth);
      if (
        JSON.stringify(oldAttrsExceptWidth) ==
        JSON.stringify(newAttrsExceptWidth)
      )
        return true;
      return false;
    }
  };
}
