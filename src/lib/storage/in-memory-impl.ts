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
export class MapBlockStorage extends BaseBlockStorage {
  addBlock(params: AddBlockParams, source?: UpdateSource, metadata?: EventMetadata): void {
    // 确保新块有 textContent 字段
    const blockParams: AddBlockParams = {
      ...params,
      textContent: params.textContent || "", // 如果没有提供 textContent，使用空字符串
    };

    // 调用父类的 addBlock 方法
    super.addBlock(blockParams, source, metadata);
  }
}
