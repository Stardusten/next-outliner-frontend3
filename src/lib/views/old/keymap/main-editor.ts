import { useLlm } from "@/composables/use-llm.ts/useLlm";
import { chainCommands, toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import type { Command, EditorState } from "prosemirror-state";
import {
  backspaceAfterCharBeforeExpandedFile,
  codeblockIndent,
  codeblockInsertLineBreak,
  codeblockMoveToLineEnd,
  codeblockMoveToLineStart,
  codeblockOutdent,
  codeblockSelectAll,
  copyBlockRef,
  deleteBeforeCharBeforeExpandedFile,
  deleteEmptyListItem,
  deleteSelected,
  demoteSelected,
  insertLineBreak,
  mergeWithPreviousBlock,
  moveBlockDown,
  moveBlockUp,
  promoteSelected,
  redoCommand,
  selectCurrentListItem,
  splitListItem,
  toggleFocusedFoldState,
  undoCommand,
} from "../commands";
import { findCurrListItem, type TiptapEditorView } from "../editor";
import { schema } from "../editor";

export function createMainEditorKeymap(editor: TiptapEditorView) {
  const dispatchByBlockType =
    (cmds: Record<string, Command>) =>
    (state: EditorState, ...args: any[]) => {
      if (!editor.view) return false;
      const currListItem = findCurrListItem(state);
      if (currListItem == null) return false;

      const type = currListItem.node.attrs.type;
      let cmd = cmds[type];

      // 支持通配符 *
      if (cmd == null) {
        cmd = cmds["*"];
      }
      if (cmd == null) return false;

      return cmd(state, ...args);
    };

  const toggleFoldTrue = toggleFocusedFoldState(editor, true, undefined);
  const toggleFoldFalse = toggleFocusedFoldState(editor, false, undefined);

  return keymap({
    Tab: dispatchByBlockType({
      text: chainCommands(demoteSelected(editor), stop),
      code: codeblockIndent(),
    }),
    "Shift-Tab": dispatchByBlockType({
      text: chainCommands(promoteSelected(editor), stop),
      code: codeblockOutdent(),
    }),
    Enter: dispatchByBlockType({
      text: chainCommands(splitListItem(editor), stop),
      code: codeblockInsertLineBreak(),
    }),
    Backspace: dispatchByBlockType({
      text: chainCommands(
        deleteEmptyListItem(editor),
        mergeWithPreviousBlock(editor),
        deleteSelected(),
        backspaceAfterCharBeforeExpandedFile()
      ),
      code: chainCommands(
        deleteEmptyListItem(editor),
        deleteSelected(),
        backspaceAfterCharBeforeExpandedFile()
      ),
    }),
    Delete: dispatchByBlockType({
      text: chainCommands(
        deleteEmptyListItem(editor, "forward"),
        deleteSelected(),
        deleteBeforeCharBeforeExpandedFile()
      ),
      code: chainCommands(
        deleteEmptyListItem(editor),
        deleteSelected(),
        deleteBeforeCharBeforeExpandedFile()
      ),
    }),
    "Mod-a": dispatchByBlockType({
      text: selectCurrentListItem(editor),
      search: selectCurrentListItem(editor),
      code: codeblockSelectAll(editor),
    }),
    "Mod-ArrowUp": chainCommands(toggleFoldTrue, stop),
    "Mod-ArrowDown": chainCommands(toggleFoldFalse, stop),
    "Alt-ArrowUp": chainCommands(moveBlockUp(editor), stop),
    "Alt-ArrowDown": chainCommands(moveBlockDown(editor), stop),
    "Mod-b": toggleMark(schema.marks.bold),
    "Mod-i": toggleMark(schema.marks.italic),
    "Mod-u": toggleMark(schema.marks.underline),
    "Mod-`": toggleMark(schema.marks.code),
    "Mod-Shift-l": copyBlockRef(editor),
    // 代码块中的行首/行尾导航
    Home: dispatchByBlockType({
      codeblock: codeblockMoveToLineStart(editor),
    }),
    End: dispatchByBlockType({
      codeblock: codeblockMoveToLineEnd(),
    }),
    "Shift-Enter": dispatchByBlockType({
      text: insertLineBreak(),
    }),
    "Mod-z": undoCommand(editor),
    "Mod-Shift-z": redoCommand(editor),
    // "Mod-Shift-g": (state, dispatch) => {
    //   const currListItem = findCurrListItem(state);
    //   if (currListItem == null) return false;

    //   if (dispatch) {
    //     const tr = state.tr;
    //     const fileNode = schema.nodes.file.create({
    //       path: "image.png__58EElIM8gOC7PaWjfg2yB.png__1751167844770__4x0awrsuVeeCCO6mAEt0H",
    //       displayMode: "preview",
    //       filename: "image.png__58EElIM8gOC7PaWjfg2yB.png",
    //       type: "image",
    //       size: 100,
    //     });
    //     tr.replaceSelectionWith(fileNode);
    //     dispatch(tr);
    //   }
    //   return true;
    // },
    "Mod-k": (state, dispatch, view) => {
      const currListItem = findCurrListItem(state);
      if (currListItem == null) return false;

      if (dispatch) {
        const tr = state.tr;
        tr.setNodeMarkup(currListItem.pos + 1, schema.nodes.search, {
          query: "8168@15638472396268051535",
        });
        dispatch(tr);
      }
      return true;
    },
  });
}

const stop: Command = () => true;
