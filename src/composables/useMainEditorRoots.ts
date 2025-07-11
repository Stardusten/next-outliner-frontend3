import type { BlockId } from "@/lib/common/types";
import { useLocalStorage } from "./useLocalStorage";
import type { WritableComputedRef } from "vue";

let mainEditorRoots: WritableComputedRef<BlockId[]> | null = null;

export function useMainEditorRoots() {
  if (!mainEditorRoots) {
    mainEditorRoots = useLocalStorage<BlockId[]>("mainEditorRoots", []);
  }
  return { mainEditorRoots };
}
