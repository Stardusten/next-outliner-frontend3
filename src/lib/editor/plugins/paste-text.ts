import {
  Fragment,
  Node as ProseMirrorNode,
  DOMParser as ProsemirrorDOMParser,
  Slice,
} from "prosemirror-model";
import { outlinerSchema } from "../schema";
import { nanoid } from "nanoid";
import { serialize } from "../utils";
import type { Block, BlockId } from "@/lib/blocks/types";
import type { BlockStorage } from "@/lib/storage/interface";
import { Plugin } from "prosemirror-state";
import { findCurrListItem, isEmptyListItem } from "../commands";
import { UpdateSources } from "../update-source";

type TempBlock = Omit<Block, "fractionalIndex"> & {
  childrenIds: TempBlock[];
};

const blockTags: { [tagName: string]: boolean } = {
  ADDRESS: true,
  ARTICLE: true,
  ASIDE: true,
  BLOCKQUOTE: true,
  BODY: true,
  CANVAS: true,
  DD: true,
  DIV: true,
  DL: true,
  FIELDSET: true,
  FIGCAPTION: true,
  FIGURE: true,
  FOOTER: true,
  FORM: true,
  H1: true,
  H2: true,
  H3: true,
  H4: true,
  H5: true,
  H6: true,
  HEADER: true,
  HGROUP: true,
  HR: true,
  LI: true,
  NOSCRIPT: true,
  OL: true,
  OUTPUT: true,
  P: true,
  PRE: true,
  SECTION: true,
  TABLE: true,
  TFOOT: true,
  UL: true,
};

const ignoreTags: { [tagName: string]: boolean } = {
  HEAD: true,
  NOSCRIPT: true,
  OBJECT: true,
  SCRIPT: true,
  STYLE: true,
  TITLE: true,
};

const HTTP_LINK_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}(\.[a-zA-Z0-9()]{1,6})?\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;

function linkify(fragment: Fragment): Fragment {
  const linkified: ProseMirrorNode[] = [];

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
        linkified.push(
          child.cut(start, end).mark(linkMark.addToSet(child.marks))
        );
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

function parseHtml(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const ctx: TempBlock[] = [];
  const blocks: Record<string, TempBlock> = {};
  const domParser = ProsemirrorDOMParser.fromSchema(outlinerSchema);

  function addBlock(dom: Node, ctx: TempBlock[], parentId: string | null) {
    const pNode = outlinerSchema.nodes.paragraph.create({});
    let pNode2 = domParser.parse(dom, { topNode: pNode });
    if (pNode2.content.size === 0) return;

    // 解析链接
    const linkified = linkify(pNode2.content);
    const slice = Slice.maxOpen(linkified);
    pNode2 = pNode2.replace(0, pNode2.content.size, slice);

    const id = nanoid();
    blocks[id] = {
      id,
      ...serialize(pNode2),
      childrenIds: [],
      parentId,
      folded: false, // 默认不折叠
    };
    ctx.push(blocks[id]);
  }

  function traverse(node: Node, ctx: TempBlock[], parentId: string | null) {
    if (node instanceof HTMLOListElement || node instanceof HTMLUListElement) {
      const newCtx = ctx.length === 0 ? ctx : ctx[ctx.length - 1].childrenIds;
      const newParentId = ctx.length === 0 ? parentId : ctx[ctx.length - 1].id;
      for (const child of (node as HTMLElement).childNodes) {
        traverse(child, newCtx, newParentId); // 对每个子元素递归
      }
    } else if (node instanceof HTMLElement && blockTags[node.tagName]) {
      const childNodes = [...node.childNodes.values()];
      for (let i = 0; i < childNodes.length; i++) {
        let j = i;
        for (; j < childNodes.length; j++) {
          const jthChild = childNodes[j];
          if (jthChild instanceof HTMLElement && blockTags[jthChild.tagName])
            break;
        }
        if (j > i) {
          const el = document.createElement("div");
          el.append(...childNodes.slice(i, j));
          addBlock(el, ctx, parentId);
          el.remove();
        }
        if (j < childNodes.length) {
          traverse(childNodes[j], ctx, parentId);
        }
        i = j;
      }
    } else if (node instanceof HTMLElement && ignoreTags[node.tagName]) {
      return;
    } else {
      addBlock(node, ctx, parentId);
    }
  }

  traverse(doc.body, ctx, null); // 根块没有父块
  return [ctx, blocks] as const;
}

export function createPastePlugin(storage: BlockStorage) {
  const plugin = new Plugin({
    props: {
      handlePaste(view, event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const html = event.clipboardData?.getData("text/html");
        // 粘贴了 html 内容
        if (html) {
          const [parsedTree, parsedBlocks] = parseHtml(html);
          const cnt = Object.keys(parsedBlocks).length; // 解析出多少个块

          if (cnt <= 0) return true;
          else if (cnt == 1) {
            // 粘贴了一个块，则我们不创建新块，直接用粘贴的这个块的内容
            // 替换当前选区
            const block = parsedTree[0];
            const pNodeJson = JSON.parse(block.content);
            const pNode = outlinerSchema.nodeFromJSON(pNodeJson);
            const tr = view.state.tr;
            tr.replaceSelectionWith(pNode);
            view.dispatch(tr);
          } else {
            const currListItem = findCurrListItem(view.state);
            const currBlockId = currListItem?.node.attrs.blockId ?? null;
            if (currBlockId == null) return true;

            // 粘贴了多于一个块，则粘贴所有块到当前块下方
            // 1. 先将 TempBlock 转换为 Block，即根据 childrenIds 计算 fractionalIndex
            const nonRootBlocks: Block[] = [];
            const rootBlocks: Block[] = [];

            function convertTempBlockToBlock(
              tempBlock: TempBlock,
              siblingIndex: number
            ): Block {
              const block: Block = {
                id: tempBlock.id,
                type: tempBlock.type,
                parentId: tempBlock.parentId,
                content: tempBlock.content,
                folded: tempBlock.folded,
                fractionalIndex: siblingIndex + 1, // 使用简单的递增策略
              };

              if (tempBlock.parentId == null) rootBlocks.push(block);
              else nonRootBlocks.push(block);

              // 递归处理子块
              tempBlock.childrenIds.forEach((childTempBlock, index) => {
                convertTempBlockToBlock(childTempBlock, index);
              });

              return block;
            }

            parsedTree.forEach((rootTempBlock) => {
              // 根块的 fractionalIndex 之后反正会重新计算
              // 因此这里设置为 0 就行
              convertTempBlockToBlock(rootTempBlock, 0);
            });

            // 2. 使用 insertAfterWithChildren 方法同时处理根块和非根块
            const allBlocks = [...rootBlocks, ...nonRootBlocks];

            const lastRoot = rootBlocks[rootBlocks.length - 1];
            const lastRootJson = JSON.parse(lastRoot.content);
            const lastRootNode = outlinerSchema.nodeFromJSON(lastRootJson);

            const tx = storage.createTransaction();

            // 如果当前块为空，则删除当前块
            if (currListItem?.node && isEmptyListItem(currListItem.node)) {
              tx.deleteBlock(currBlockId);
            }

            // 插入后，将光标移动到插入的最后一个块的末尾
            tx.metadata.selection = {
              blockId: rootBlocks[rootBlocks.length - 1].id,
              offset: lastRootNode.nodeSize,
            };
            tx.insertAfterWithChildren(currBlockId, allBlocks);
            tx.commit();
          }
          return true;
        }

        const text = event.clipboardData?.getData("text/plain");
        if (text) {
          // 粘贴了纯文本内容
          const lines = text
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          if (lines.length === 0) return true;
          else if (lines.length === 1) {
            const tr = view.state.tr;

            // 解析链接
            let frag = Fragment.from([outlinerSchema.text(text)]);
            frag = linkify(frag);
            const slice = Slice.maxOpen(frag);

            tr.replaceSelection(slice);
            view.dispatch(tr);
            return true;
          } else {
            // 粘贴了多行文本
            const currListItem = findCurrListItem(view.state);
            const currBlockId = currListItem?.node.attrs.blockId ?? null;
            if (currBlockId == null) return true;

            const tx = storage.createTransaction();

            // 如果当前块为空，则删除当前块
            if (currListItem?.node && isEmptyListItem(currListItem.node)) {
              tx.deleteBlock(currBlockId);
            }

            const blocks: Block[] = [];
            for (const line of lines) {
              const tNode = outlinerSchema.text(line);
              const pNode = outlinerSchema.nodes.paragraph.create({}, tNode);
              const block: Block = {
                id: nanoid(),
                parentId: null,
                fractionalIndex: 0,
                ...serialize(pNode),
                folded: false,
              };
              blocks.push(block);
            }

            tx.insertAfterWithChildren(currBlockId, blocks);
            tx.commit();
          }
        }

        return true; // 确保粘贴事件不被其他插件和 ProseMirror 默认行为处理
      },
    },
  });
  return plugin;
}
