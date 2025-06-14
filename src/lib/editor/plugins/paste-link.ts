import { EditorView } from "prosemirror-view";
import { Plugin } from "prosemirror-state";
import { Fragment, Slice, Node } from "prosemirror-model";

const HTTP_LINK_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}(\.[a-zA-Z0-9()]{1,6})?\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;

export const pasteLinkPlugin = new Plugin({
  props: {
    transformPasted(slice) {
      const linkified = linkify(slice.content);
      return new Slice(linkified, slice.openStart, slice.openEnd);
    },
  },
});

function linkify(fragment: Fragment): Fragment {
  const linkified: Node[] = [];

  fragment.forEach((child) => {
    if (child.isText) {
      const text = child.text as string;
      let pos = 0,
        match;

      // eslint-disable-next-line no-cond-assign
      while ((match = HTTP_LINK_REGEX.exec(text))) {
        const start = match.index;
        const end = start + match[0].length;
        const linkMarkType = child.type.schema.marks["link"];

        // simply copy across the text from before the match
        if (start > 0) {
          linkified.push(child.cut(pos, start));
        }

        const urlText = text.slice(start, end);
        const linkMark = linkMarkType.create({ href: urlText });
        linkified.push(child.cut(start, end).mark(linkMark.addToSet(child.marks)));
        pos = end;
      }

      // copy over whatever is left
      if (pos < text.length) {
        linkified.push(child.cut(pos));
      }
    } else {
      linkified.push(child.copy(linkify(child.content)));
    }
  });

  return Fragment.fromArray(linkified);
}
