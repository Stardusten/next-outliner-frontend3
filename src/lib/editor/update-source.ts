export const UpdateSources = {
  /** 来自本地编辑器的内容变更 */
  localEditorContent: (editorId: string) => "editorContent_" + editorId,
  /** 来自本地编辑器的结构变更 */
  localEditorStructural: "editorStructural",
  /** 来自本地导入 */
  localImport: "localImport",
  /** 来自撤销操作 */
  undo: (editorId: string) => "undo_" + editorId,
  /** 来自重做操作 */
  redo: (editorId: string) => "redo_" + editorId,
};
