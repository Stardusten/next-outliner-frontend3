<template>
  <div class="flex items-center gap-3">
    <!-- 左侧测试按钮 -->
    <Button
      variant="outline"
      class="w-[120px]"
      :disabled="testing"
      @click="testConnection"
    >
      测试连接
    </Button>

    <!-- 右侧状态信息 -->
    <div class="flex items-center gap-2 text-sm">
      <template v-if="testing">
        <LoaderIcon class="w-4 h-4 animate-spin text-muted-foreground" />
        <span class="text-muted-foreground">测试中...</span>
      </template>
      <template v-else-if="testResult">
        <CheckIcon v-if="testResult.success" class="w-4 h-4 text-green-500" />
        <XIcon v-else class="w-4 h-4 text-red-500" />
        <span :class="[testResult.success ? 'text-green-600' : 'text-red-600']">
          {{ testResult.message }}
        </span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  testLlmConnection,
  useLlm,
  type LlmModelConfig,
} from "@/composables/use-llm.ts/useLlm";
import type { SettingRenderContext } from "@/composables/useSettings";
import { CheckIcon, LoaderIcon, XIcon } from "lucide-vue-next";
import { ref } from "vue";

interface Props {
  context: SettingRenderContext;
}

const props = defineProps<Props>();

const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

const testConnection = async () => {
  const { config, getSetting } = props.context;

  // 检查必填配置
  const requiredFields = [
    { path: "llm.serviceProvider" as const, label: "模型提供商" },
    { path: "llm.apiKey" as const, label: "API Key" },
    { path: "llm.modelName" as const, label: "模型名称" },
  ];

  const missingFields = requiredFields.filter(
    (field) => !getSetting(field.path)
  );

  if (missingFields.length > 0) {
    testResult.value = {
      success: false,
      message: `请先填写：${missingFields.map((f) => f.label).join(", ")}`,
    };
    return;
  }

  testing.value = true;
  testResult.value = null;

  try {
    const llmConfig: LlmModelConfig = {
      service: getSetting("llm.serviceProvider"),
      baseUrl: getSetting("llm.baseUrl"),
      apiKey: getSetting("llm.apiKey"),
      model: getSetting("llm.modelName"),
      temperature: getSetting("llm.temperature"),
      think: getSetting("llm.enableThinking"),
    };
    console.log(llmConfig);

    const success = await testLlmConnection(llmConfig);
    if (success) {
      testResult.value = {
        success: true,
        message: "连接成功",
      };
    } else {
      testResult.value = {
        success: false,
        message: "不好，连接失败了",
      };
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: error instanceof Error ? error.message : "不好，连接失败了",
    };
  } finally {
    testing.value = false;
  }
};
</script>
