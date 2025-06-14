import { keymap } from "prosemirror-keymap";
import type { BlockStorage } from "../storage/interface";
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
  selectCurrentListItem,
  splitListItem,
  toggleFocusedFoldState,
} from "./commands";
import type { Command, EditorState } from "prosemirror-state";
import { chainCommands, toggleMark } from "prosemirror-commands";
import { outlinerSchema } from "./schema";

export function createKeymapPlugin(storage: BlockStorage) {
  const toggleFoldTrue = toggleFocusedFoldState(storage, true, undefined);
  const toggleFoldFalse = toggleFocusedFoldState(storage, false, undefined);

  return keymap({
    Tab: dispatchByBlockType({
      text: chainCommands(demoteSelected(storage), stop),
      code: codeblockIndent(),
    }),
    "Shift-Tab": dispatchByBlockType({
      text: chainCommands(promoteSelected(storage), stop),
      code: codeblockOutdent(),
    }),
    Enter: dispatchByBlockType({
      text: chainCommands(splitListItem(storage), stop),
      code: codeblockInsertLineBreak(),
    }),
    Backspace: dispatchByBlockType({
      text: chainCommands(
        deleteEmptyListItem(storage),
        mergeWithPreviousBlock(storage),
        deleteSelected(),
      ),
      code: chainCommands(deleteEmptyListItem(storage), deleteSelected()),
    }),
    Delete: dispatchByBlockType({
      text: chainCommands(deleteEmptyListItem(storage, "forward"), deleteSelected()),
      code: chainCommands(deleteEmptyListItem(storage), deleteSelected()),
    }),
    "Mod-a": dispatchByBlockType({
      text: selectCurrentListItem(),
      code: codeblockSelectAll(),
    }),
    "Mod-ArrowUp": chainCommands(toggleFoldTrue, stop),
    "Mod-ArrowDown": chainCommands(toggleFoldFalse, stop),
    "Alt-ArrowUp": chainCommands(moveBlockUp(storage), stop),
    "Alt-ArrowDown": chainCommands(moveBlockDown(storage), stop),
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
