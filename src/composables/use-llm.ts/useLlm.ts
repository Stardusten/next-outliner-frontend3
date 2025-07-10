import type { BlockId } from "@/lib/common/types";
import { computed, ref } from "vue";
import { useSettings } from "../useSettings";
import { toast } from "vue-sonner";
import { buildTextContent, serialize, toMarkdown } from "@/lib/editor/utils";
import type { App } from "@/lib/app/app";
import LLM, { type PartialStreamResponse } from "../../lib/llm";
import { getLastFocusedEditor } from "@/lib/app/editors";
import { getBlockNode } from "@/lib/app/block-manage";
import { withTx } from "@/lib/app/tx";
import { nanoid } from "nanoid";
import { outlinerSchema } from "@/lib/editor/schema";
import { AppendChildrenTaskUtils } from "./append-children-task";

export type LlmModelConfig = {
  service: string;
  baseUrl?: string;
  apiKey: string;
  model: string;
  temperature: number;
  think: boolean;
};

/**
 * 一类 Llm 任务，指定一个块，以这个块所在子树为上下文
 * 生成的内容追加为这个块的子块
 */
export type LlmAppendChildrenTask = {
  ctxBlockId: BlockId;
  status: "pending" | "generating" | "success" | "aborted" | "failed";
};

export const testLlmConnection = async (config: LlmModelConfig) => {
  const llm = new LLM({
    service: config.service,
    baseUrl: config.baseUrl,
    model: config.model,
    apiKey: config.apiKey,
    // max_tokens: 50,
    temperature: config.temperature,
    think: config.think,
  });
  return await llm.verifyConnection();
};

const thinkingBlockIds = ref<Set<BlockId>>(new Set());

export function useLlm(app: App) {
  const settings = useSettings();

  const createAppendChildrenTask = (ctxBlockId: BlockId) => {
    const config = {
      service: settings.getSetting("llmServiceProvider"),
      baseUrl: settings.getSetting("llmBaseUrl"),
      model: settings.getSetting("llmModelName"),
      apiKey: settings.getSetting("llmApiKey"),
      temperature: settings.getSetting("llmTemperature"),
      think: settings.getSetting("llmEnableThinking"),
    };
    const task = AppendChildrenTaskUtils.create(app, ctxBlockId, config);

    // 监听任务状态变化，更新 thinkingBlockIds
    const listener = (status: any) => {
      if (status === "generating") {
        thinkingBlockIds.value.add(ctxBlockId);
      } else if (
        status === "success" ||
        status === "aborted" ||
        status === "failed"
      ) {
        thinkingBlockIds.value.delete(ctxBlockId);
        task.eb.off("update:status", listener);
      }
    };
    task.eb.on("update:status", listener);

    return {
      task,
      start: () => AppendChildrenTaskUtils.start(app, task),
      abort: () => AppendChildrenTaskUtils.abort(task),
      on: task.eb.on,
      off: task.eb.off,
    };
  };

  return {
    createAppendChildrenTask,
    thinkingBlockIds,
  };
}
