import { keymap } from "prosemirror-keymap";
import {
  codeblockIndent,
  codeblockInsertLineBreak,
  codeblockMoveToLineEnd,
  codeblockMoveToLineStart,
  codeblockOutdent,
  codeblockSelectAll,
  copyBlockRef,
  deleteEmptyListItem,
  deleteSelected,
  demoteSelected,
  findCurrListItem,
  mergeWithPreviousBlock,
  moveBlockDown,
  moveBlockUp,
  promoteSelected,
  redo,
  selectCurrentListItem,
  splitListItem,
  toggleFocusedFoldState,
  undo,
} from "./commands";
import type { Command, EditorState } from "prosemirror-state";
import { chainCommands, toggleMark } from "prosemirror-commands";
import { outlinerSchema } from "./schema";
import type { Editor } from "./interface";
import type { App } from "../app/app";

export function createKeymapPlugin(editor: Editor, app: App) {
  const toggleFoldTrue = toggleFocusedFoldState(app, true, undefined);
  const toggleFoldFalse = toggleFocusedFoldState(app, false, undefined);

  return keymap({
    Tab: dispatchByBlockType({
      text: chainCommands(demoteSelected(app), stop),
      code: codeblockIndent(),
    }),
    "Shift-Tab": dispatchByBlockType({
      text: chainCommands(promoteSelected(app), stop),
      code: codeblockOutdent(),
    }),
    Enter: dispatchByBlockType({
      text: chainCommands(splitListItem(app), stop),
      code: codeblockInsertLineBreak(),
    }),
    Backspace: dispatchByBlockType({
      text: chainCommands(
        deleteEmptyListItem(app),
        mergeWithPreviousBlock(app),
        deleteSelected()
      ),
      code: chainCommands(deleteEmptyListItem(app), deleteSelected()),
    }),
    Delete: dispatchByBlockType({
      text: chainCommands(
        deleteEmptyListItem(app, "forward"),
        deleteSelected()
      ),
      code: chainCommands(deleteEmptyListItem(app), deleteSelected()),
    }),
    "Mod-a": dispatchByBlockType({
      text: selectCurrentListItem(),
      code: codeblockSelectAll(),
    }),
    "Mod-ArrowUp": chainCommands(toggleFoldTrue, stop),
    "Mod-ArrowDown": chainCommands(toggleFoldFalse, stop),
    "Alt-ArrowUp": chainCommands(moveBlockUp(app), stop),
    "Alt-ArrowDown": chainCommands(moveBlockDown(app), stop),
    "Mod-b": toggleMark(outlinerSchema.marks.bold),
    "Mod-i": toggleMark(outlinerSchema.marks.italic),
    "Mod-u": toggleMark(outlinerSchema.marks.underline),
    "Mod-`": toggleMark(outlinerSchema.marks.code),
    "Mod-Shift-l": copyBlockRef(),
    // 代码块中的行首/行尾导航
    Home: dispatchByBlockType({
      codeblock: codeblockMoveToLineStart(),
    }),
    End: dispatchByBlockType({
      codeblock: codeblockMoveToLineEnd(),
    }),
    "Mod-z": undo(editor),
    "Mod-Shift-z": redo(editor),
  });
}

const stop: Command = () => true;

const dispatchByBlockType =
  (cmds: Record<string, Command>) =>
  (state: EditorState, ...args: any[]) => {
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
