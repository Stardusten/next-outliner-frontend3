import type { Block, BlockId, BlockLoaded } from "../blocks/types";
import { sortChildren } from "../blocks/utils";
import { Observable } from "../reactivity/observable";
import type {
  BlockStorage,
  BlockStorageEvent,
  BlockStorageEventListener,
  AddBlockParams,
  UpdateBlockParams,
  UpdateSource,
  EventMetadata,
} from "./interface";
import { BaseBlockStorage } from "./base-impl";

// Map 实现的块存储，仅用于 demo 或者测试
export class MapBlockStorage extends BaseBlockStorage {}
