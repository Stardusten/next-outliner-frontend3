import { keymap } from "prosemirror-keymap";
import {
  codeblockIndent,
  codeblockInsertLineBreak,
  codeblockMoveToLineEnd,
  codeblockMoveToLineStart,
  codeblockOutdent,
  codeblockSelectAll,
  copyBlockRef,
  backspaceAfterCharBeforeExpandedFile,
  deleteEmptyListItem,
  deleteSelected,
  demoteSelected,
  insertLineBreak,
  mergeWithPreviousBlock,
  moveBlockDown,
  moveBlockUp,
  promoteSelected,
  redo,
  selectCurrentListItem,
  splitListItem,
  toggleFocusedFoldState,
  undo,
  deleteBeforeCharBeforeExpandedFile,
  uploadFile,
} from "./commands";
import type { Command, EditorState } from "prosemirror-state";
import { chainCommands, toggleMark } from "prosemirror-commands";
import { outlinerSchema } from "./schema";
import { findCurrListItem, type Editor } from "./editor";
import {
  useLlm,
  type LlmAppendChildrenTask,
} from "@/composables/use-llm.ts/useLlm";

export function createKeymapPlugin(editor: Editor) {
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
      code: codeblockSelectAll(editor),
    }),
    "Mod-ArrowUp": chainCommands(toggleFoldTrue, stop),
    "Mod-ArrowDown": chainCommands(toggleFoldFalse, stop),
    "Alt-ArrowUp": chainCommands(moveBlockUp(editor), stop),
    "Alt-ArrowDown": chainCommands(moveBlockDown(editor), stop),
    "Mod-b": toggleMark(outlinerSchema.marks.bold),
    "Mod-i": toggleMark(outlinerSchema.marks.italic),
    "Mod-u": toggleMark(outlinerSchema.marks.underline),
    "Mod-`": toggleMark(outlinerSchema.marks.code),
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
    "Mod-z": undo(editor),
    "Mod-Shift-z": redo(editor),
    // "Mod-Shift-g": (state, dispatch) => {
    //   const currListItem = findCurrListItem(state);
    //   if (currListItem == null) return false;

    //   if (dispatch) {
    //     const tr = state.tr;
    //     const fileNode = outlinerSchema.nodes.file.create({
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
        const llm = useLlm(editor.app); // 暂时使用默认配置
        const blockId = currListItem.node.attrs.blockId;
        const task = llm.createAppendChildrenTask(blockId);
        task.start();
      }
      return true;
    },
  });
}

const stop: Command = () => true;
