import { getSchema } from "@tiptap/core";
import { markExtensions } from "./marks";
import { nodeExtensions } from "./nodes";

export const detachedSchema = getSchema([...nodeExtensions, ...markExtensions]);
