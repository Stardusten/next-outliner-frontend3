import { Extension } from "@tiptap/vue-3";
import { EditableOutlineView } from "../editable-outline";

const SELECTION_TRACKER = "selectionTracker";

export const FocusedBlockIdTracker = Extension.create({
  name: SELECTION_TRACKER,
  onSelectionUpdate({ editor }) {
    if (editor.appView instanceof EditableOutlineView) {
      const focusedBlockId = editor.appView.getFocusedBlockId();
      editor.appView.focusedBlockId.value = focusedBlockId;
    }
  },
});
