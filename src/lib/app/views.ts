import type { AppView, AppViewId } from "../views/view";
import type { App, EditorId } from "./app";

export function initAppViews(app: App) {
  app.appViews = {};
  app.lastFocusedAppViewId = null;
}

export function registerAppView(app: App, view: AppView<any>) {
  const oldView = app.appViews[view.id];
  if (oldView) throw new Error(`View ${view.id} already registered`);
  else {
    app.appViews[view.id] = view;

    // 监听 focus 事件，更新 lastFocusedEditorId
    view.on("focus", () => {
      app.lastFocusedAppViewId = view.id;
    });
  }
}

export function unregisterAppView(app: App, viewId: AppViewId) {
  const view = app.appViews[viewId];
  if (!view) return;
  delete app.appViews[viewId];
}

export function getLastFocusedAppView(app: App, rollback: AppViewId = "main") {
  const res = app.lastFocusedAppViewId
    ? app.appViews[app.lastFocusedAppViewId]
    : null;
  return res ?? app.appViews[rollback];
}

export function getFocusingAppView(app: App) {
  const lastFocused = app.lastFocusedAppViewId
    ? app.appViews[app.lastFocusedAppViewId]
    : null;
  if (!lastFocused) return null;
  return lastFocused.hasFocus() ? lastFocused : null;
}
