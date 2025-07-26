import { Plugin } from "prosemirror-state";
import type { TiptapEditorView } from "../editor";

export function createCompositionFixPlugin(editor: TiptapEditorView) {
  const plugin = new Plugin({
    props: {
      handleDOMEvents: {
        compositionend: (e) => {
          editor.deferredContentSyncTask?.();
        },
      },
    },
  });
  return plugin;
}
