import type { BlockId } from "../common/types";
import type { App } from "./app";
import { searchBlocks } from "./index/fulltext";
import { getInRefs, getInTags } from "./index/in-refs";

export function execQuery(app: App, query: string): BlockId[] | Error {
  const hasRefTo = (blockId: BlockId) => {
    const res = getInRefs(app, blockId);
    return [...res.value];
  };

  const hasTagTo = (blockId: BlockId) => {
    const res = getInTags(app, blockId);
    return [...res.value];
  };

  const hasRefOrTagTo = (blockId: BlockId) => {
    const res1 = getInRefs(app, blockId);
    const res2 = getInTags(app, blockId);
    return [...res1.value, ...res2.value];
  };

  const all = () => {
    return app.tree.getNodes().map((node) => node.id);
  };

  const fuzzyMatch = (query: string, limit?: number) => {
    const res = searchBlocks(app, query, limit);
    return res;
  };

  try {
    const res = Function(
      "hasRefTo",
      "hasTagTo",
      "hasRefOrTagTo",
      "all",
      "fuzzyMatch",
      `"use strict"; return (${query})`
    )(hasRefTo, hasTagTo, hasRefOrTagTo, all, fuzzyMatch);
    if (!Array.isArray(res))
      throw new Error("Query result should be array of blockId");
    for (const elem of res) {
      if (typeof elem != "string")
        throw new Error("Query result should be array of blockId");
    }
    return res;
  } catch (err) {
    return err as Error;
  }
}
