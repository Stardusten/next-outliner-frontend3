import { Plugin } from "prosemirror-state";
import type { Editor } from "../editor";

export function createCompositionFixPlugin(editor: Editor) {
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
