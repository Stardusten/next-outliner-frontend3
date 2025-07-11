import { archiveIcon } from "./icons/archive";
import { audioIcon } from "./icons/audio";
import { defaultFileIcon } from "./icons/file";
import { imageIcon } from "./icons/image";
import { textIcon } from "./icons/text";
import { videoIcon } from "./icons/video";
import { loadingIcon } from "./icons/loading";
import { errorIcon } from "./icons/error";

export type FileType =
  | "image"
  | "video"
  | "audio"
  | "text"
  | "archive"
  | "unknown";

export function getFileType(path: string): FileType {
  const ext = path.toLowerCase().split(".").pop() || "";

  // 图片类型
  if (
    ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(ext)
  ) {
    return "image";
  }

  // 视频类型
  if (
    ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "m4v", "3gp"].includes(
      ext
    )
  ) {
    return "video";
  }

  // 音频类型
  if (["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"].includes(ext)) {
    return "audio";
  }

  // 文本类型
  if (
    [
      "txt",
      "md",
      "doc",
      "docx",
      "pdf",
      "rtf",
      "csv",
      "json",
      "xml",
      "html",
      "css",
      "js",
      "ts",
      "py",
      "java",
      "cpp",
      "c",
      "h",
    ].includes(ext)
  ) {
    return "text";
  }

  // 压缩文件类型
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext)) {
    return "archive";
  }

  return "unknown";
}

export function getFileTypeText(type: FileType): string {
  switch (type) {
    case "image":
      return "图片";
    case "video":
      return "视频";
    case "audio":
      return "音频";
    case "text":
      return "文档";
    case "archive":
      return "压缩包";
    default:
      return "文件";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// 获取文件图标
export function fileIcon(
  filename: string,
  type?: string,
  size: number = 20
): string {
  const fileType = getFileType(filename);
  switch (fileType) {
    case "image":
      return imageIcon(size, size);
    case "video":
      return videoIcon(size, size);
    case "audio":
      return audioIcon(size, size);
    case "text":
      return textIcon(size, size);
    case "archive":
      return archiveIcon(size, size);
    default:
      return defaultFileIcon(size, size);
  }
}

// 根据状态获取图标
export function getStatusIcon(status: FileStatus, size: number = 20): string {
  if (status.type === "uploading") {
    return loadingIcon(size, size);
  }

  if (status.type === "failed") {
    return errorIcon(size, size);
  }

  return defaultFileIcon(size, size);
}

// 文件状态解析工具
export interface FileStatus {
  type: "uploading" | "uploaded" | "failed";
  progress?: number; // 0-100，仅在 uploading 时有效
  errorCode?: number; // 仅在 failed 时有效
}

export function parseFileStatus(status: string): FileStatus {
  if (status === "uploaded") {
    return { type: "uploaded" };
  }

  if (status.startsWith("uploading-")) {
    const progress = parseInt(status.split("-")[1], 10);
    return {
      type: "uploading",
      progress: isNaN(progress) ? 0 : Math.min(100, Math.max(0, progress)),
    };
  }

  if (status.startsWith("failed-")) {
    const errorCode = parseInt(status.split("-")[1], 10);
    return {
      type: "failed",
      errorCode: isNaN(errorCode) ? 0 : errorCode,
    };
  }

  // 默认为已上传状态
  return { type: "uploaded" };
}

export function createFileStatus(type: "uploaded"): string;
export function createFileStatus(type: "uploading", progress: number): string;
export function createFileStatus(type: "failed", errorCode: number): string;
export function createFileStatus(
  type: "uploading" | "uploaded" | "failed",
  value?: number
): string {
  if (type === "uploaded") {
    return "uploaded";
  }
  if (type === "uploading") {
    const progress = Math.min(100, Math.max(0, value || 0));
    return `uploading-${progress}`;
  }
  if (type === "failed") {
    return `failed-${value || 0}`;
  }
  return "uploaded";
}
