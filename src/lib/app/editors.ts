import { createEditor, isFocused } from "../editor/editor";
import type { App, EditorId } from "./app";

export function initEditors(app: App) {
  app.editors = {};
  app.lastFocusedEditorId = null;
}

export function getEditorFromApp(app: App, editorId: EditorId) {
  const editor = app.editors[editorId];
  if (editor) return editor;
  else {
    const newEditor = createEditor(app, editorId, []);
    app.editors[editorId] = newEditor;

    // 监听 focus 事件，更新 lastFocusedEditorId
    newEditor.on("focus", () => {
      app.lastFocusedEditorId = editorId;
    });

    return newEditor;
  }
}

export function getLastFocusedEditor(app: App) {
  return app.lastFocusedEditorId ? app.editors[app.lastFocusedEditorId] : null;
}

export function getFocusingEditor(app: App) {
  const lastFocused = app.lastFocusedEditorId
    ? app.editors[app.lastFocusedEditorId]
    : null;
  if (!lastFocused) return null;
  return isFocused(lastFocused) ? lastFocused : null;
}
