import type { App } from "@/lib/app/app";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import {
  getFileType,
  getFileTypeText,
  parseFileStatus,
  getStatusIcon,
  fileIcon,
} from "../../common";
import { h } from "../h";
import { imagePreview } from "./image";

export function filePreview(
  app: App,
  view: EditorView,
  node: ProseMirrorNode,
  getPos: () => number
): HTMLElement {
  const { filename, path, type, size, status, extraInfo } = node.attrs;

  // 使用 common.ts 中的状态解析函数
  const parsedStatus = parseFileStatus(status);
  const fileType = getFileType(filename);

  // 如果正在上传或上传失败，显示状态提示
  if (parsedStatus.type === "uploading" || parsedStatus.type === "failed") {
    const statusText =
      parsedStatus.type === "uploading"
        ? `上传中 ${parsedStatus.progress || 0}%`
        : "上传失败";

    const icon =
      parsedStatus.type === "uploading" || parsedStatus.type === "failed"
        ? getStatusIcon(parsedStatus, 20)
        : fileIcon(filename, type, 20);

    return h(
      "div",
      {
        className: `file-preview-status ${status}`,
        style: `
        display: inline-block;
        padding: 16px 20px;
        background: var(--muted);
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 14px;
        margin: 4px 0;
        color: var(--foreground);
        min-width: 200px;
        text-align: center;
      `,
      },
      h(
        "div",
        {
          style: `
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        `,
        },
        h("span", {
          style: `
            display: inline-block;
            transform: translateY(1px);
          `,
          innerHTML: icon,
        }),
        h("span", {
          textContent: `${filename} (${statusText})`,
        })
      )
    );
  }

  // 检查文件类型支持
  if (fileType !== "image") {
    return h("div", {
      className: "file-preview-error",
      style: `
        display: inline-block;
        padding: 12px 16px;
        background: var(--destructive/10);
        color: var(--destructive);
        border: 1px solid var(--destructive/20);
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
