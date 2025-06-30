import type { App } from "@/lib/app/app";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { getFileType, getFileTypeText } from "../../common";
import { h } from "../h";
import { imagePreview } from "./image";

export function filePreview(
  app: App,
  view: EditorView,
  node: ProseMirrorNode,
  getPos: () => number
): HTMLElement {
  const { filename, path, type, size, extraInfo } = node.attrs;

  const fileType = getFileType(filename);

  if (fileType !== "image") {
    return h("div", {
      className: "file-preview-error",
      style: `
        display: inline-block;
        padding: 12px 16px;
        background: var(--color-bg-error);
        color: var(--color-text-error);
        border: 1px solid var(--color-border-error);
        border-radius: 6px;
        font-size: var(--ui-font-size-small);
        margin: 4px 0;
      `,
      textContent: `预览模式暂不支持 ${getFileTypeText(fileType)} 文件`,
    });
  }
  // 渲染图片预览
  return imagePreview(app, view, node, getPos);
}
