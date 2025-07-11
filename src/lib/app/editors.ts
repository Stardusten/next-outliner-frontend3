import { editorUtils, type EditorOptions } from "../editor/editor";
import type { App, EditorId } from "./app";

export function initEditors(app: App) {
  app.editors = {};
  app.lastFocusedEditorId = null;
}

export function getEditorFromApp(app: App, opts: EditorOptions & { id: EditorId }) {
  const editor = app.editors[opts.id];
  if (editor) return editor;
  else {
    const newEditor = editorUtils.createEditor(app, opts);
    app.editors[opts.id] = newEditor;

    // 监听 focus 事件，更新 lastFocusedEditorId
    newEditor.on("focus", () => {
      app.lastFocusedEditorId = opts.id;
    });

    return newEditor;
  }
}

export function unregisterEditor(app: App, editorId: EditorId) {
  const editor = app.editors[editorId];
  if (!editor) return;
  delete app.editors[editorId];
}

export function getLastFocusedEditor(app: App, rollback: string = "main") {
  const res = app.lastFocusedEditorId
    ? app.editors[app.lastFocusedEditorId]
    : null;
  return res ?? app.editors[rollback];
}

export function getFocusingEditor(app: App) {
  const lastFocused = app.lastFocusedEditorId
    ? app.editors[app.lastFocusedEditorId]
    : null;
  if (!lastFocused) return null;
  return editorUtils.isFocused(lastFocused) ? lastFocused : null;
}
