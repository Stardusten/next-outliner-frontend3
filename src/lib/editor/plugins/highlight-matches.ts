import { removeDiacritics } from "@/lib/app/index/tokenize";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const HIGHLIGHT_TERMS_KEY = "highlightTerms";

export const createHighlightMatchesPlugin = (
  highlightClass: string = "highlight-keep",
  ignoreDiacritics?: boolean
) =>
  new Plugin({
    state: {
      init() {
        return [] as string[];
      },
      apply(tr, oldValue) {
        const terms = tr.getMeta(HIGHLIGHT_TERMS_KEY);
        if (terms != null) return terms;
        return oldValue;
      },
    },
    props: {
      decorations(state) {
        const terms = this.getState(state);
        if (!terms || terms.length === 0) return null;

        let index;
        const decorations: Decoration[] = [];
        state.doc.content.descendants((node, pos) => {
          if (!node.isText) return true;
          const str = ignoreDiacritics
            ? removeDiacritics(node.textContent.toLocaleLowerCase())
            : node.textContent.toLocaleLowerCase();
          for (const term of terms) {
            index = -1;
            while ((index = str.indexOf(term, index + 1)) != -1) {
              const d = Decoration.inline(
                pos + index,
                pos + index + term.length,
                {
                  class: highlightClass,
                }
              );
              decorations.push(d);
            }
          }
        });
        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
