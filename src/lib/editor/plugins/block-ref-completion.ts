import { EditorState, Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { CompletionStatus, EditorEvent } from "../interface";
import { outlinerSchema } from "../schema";

/**
 * 检查当前状态是否应该显示补全
 */
function checkCompletionStatus(state: EditorState): CompletionStatus | null {
  const { selection } = state;
  const { $from } = selection;

  // 检查是否在文本节点中且光标不在选区中
  if (!selection.empty || !$from.parent.isTextblock) {
    return null;
  }

  // 获取光标位置前的文本
  const textBefore = $from.parent.textBetween(0, $from.parentOffset);

  // 检查是否有未完成的块引用模式 - 支持 [[ 和 【【 两种触发方式
  const blockRefMatch = textBefore.match(/(\[\[|【【)([^\]】]*?)$/);

  if (blockRefMatch) {
    return {
      from: $from.pos - blockRefMatch[0].length,
      to: $from.pos,
      query: blockRefMatch[2] || "",
      trigger: blockRefMatch[1] as "[[" | "【【",
    };
  }

  return null;
}

/**
 * 执行块引用补全
 * @param blockId - 要补全的块 ID
 * @param view - ProseMirror 编辑器视图
 * @returns 是否成功执行补全
 */
export function executeCompletion(blockId: string, view: EditorView): boolean {
  const state = view.state;
  const completionStatus = checkCompletionStatus(state);

  // 如果没有检测到补全状态，则不执行补全
  if (!completionStatus) {
    return false;
  }

  const { from, to } = completionStatus;
  const blockRefNode = outlinerSchema.nodes.blockRef.create({ blockId });
  const tr = state.tr.replaceWith(from, to, blockRefNode);
  view.dispatch(tr);
  return true;
}

type Emitter = (e: EditorEvent) => void;

export function createCompletionHelperPlugin(emit: Emitter) {
  let editorView: EditorView | null = null;

  return new Plugin({
    state: {
      init(_, state) {
        const status = checkCompletionStatus(state);
        emit({ type: "completion", status });
        return status;
      },
      apply(tr, val, _2, newState) {
        // 如果文档未改变获知 ime 激活，都不更新补全状态
        if (editorView?.composing) return val;
        const status = checkCompletionStatus(newState);
        emit({ type: "completion", status });
        return status;
      },
    },
    view(view) {
      editorView = view;

      const handleCompositionEnd = () => {
        const status = checkCompletionStatus(view.state);
        emit({ type: "completion", status });
        return status;
      };
      view.dom.addEventListener("compositionend", handleCompositionEnd);

      return {
        destroy() {
          view.dom.removeEventListener("compositionend", handleCompositionEnd);
        },
      };
    },
    props: {
      handleKeyDown(view, event) {
        const state = this.getState(view.state);

        // 只在补全激活时处理键盘事件
        if (!state || editorView?.composing) return false;

        switch (event.key) {
          case "ArrowDown":
            event.preventDefault();
            emit({ type: "completion-next" });
            return true;
          case "ArrowUp":
            event.preventDefault();
            emit({ type: "completion-prev" });
            return true;
          case "Enter":
            event.preventDefault();
            emit({ type: "completion-select" });
            return true;
          case "Escape":
            event.preventDefault();
            emit({ type: "completion", status: null });
            return true;
        }

        return false;
      },
    },
  });
}
