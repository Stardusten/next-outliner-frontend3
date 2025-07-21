import { Plugin } from "prosemirror-state";
import type { Editor } from "../editor";
import { useAttachment } from "@/composables";
import { uploadFile } from "../commands";

export function createPasteImagePlugin(editor: Editor) {
  const plugin = new Plugin({
    props: {
      handlePaste(view, event, slice) {
        // find image
        let imageExt: string | null = null;
        let imageFile: File | null = null;
        const items = event.clipboardData?.items;
        if (!items || items.length == 0) return;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const match = item.type.match(/image\/([a-z]+)/);
          if (match) {
            imageExt = match[1];
            imageFile = item.getAsFile();
          }
        }

        // save image
        if (imageExt && imageFile) {
          uploadFile(editor, async () => imageFile);
        }
      },
    },
  });
  return plugin;
}
