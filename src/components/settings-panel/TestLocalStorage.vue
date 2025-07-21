<template>
  <div class="flex items-center gap-3">
    <!-- 左侧检测按钮 -->
    <Button
      variant="outline"
      class="w-[120px]"
      :disabled="testing"
      @click="testLocalStorage"
    >
      检测知识库
    </Button>

    <!-- 右侧状态信息 -->
    <div class="flex items-center gap-2 text-sm">
      <template v-if="testing">
        <LoaderIcon class="w-4 h-4 animate-spin text-muted-foreground" />
        <span class="text-muted-foreground">检测中...</span>
      </template>
      <template v-else-if="testResult">
        <CheckIcon
          v-if="testResult.status === 'found'"
          class="w-4 h-4 text-green-500"
        />
        <AlertTriangleIcon
          v-else-if="testResult.status === 'not_found'"
          class="w-4 h-4 text-yellow-500"
        />
        <XIcon v-else class="w-4 h-4 text-red-500" />
        <span
          :class="[
            testResult.status === 'found'
              ? 'text-green-600'
              : testResult.status === 'not_found'
                ? 'text-yellow-600'
                : 'text-red-600',
          ]"
        >
          {{ testResult.message }}
        </span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import {
  LoaderIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
} from "lucide-vue-next";
import {
  LocalStoragePersistence,
  BLOCKS_TREE_NAME,
} from "@/lib/persistence/local-storage";
import { LoroDoc } from "loro-crdt";
import { base64ToUint8Array } from "@/lib/app/util";
import type { SettingRenderContext } from "@/composables/useSettings";

interface Props {
  context: SettingRenderContext;
}

const props = defineProps<Props>();

const testing = ref(false);
const testResult = ref<{
  status: "found" | "not_found" | "error";
  message: string;
  blockCount?: number;
} | null>(null);

// 检查 localStorage 中是否存在指定文档的状态键
function getStateItemKey(docId: string): string {
  return `blocks-${docId}-state`;
}

// 检查 localStorage 中是否存在指定文档的更新键
function isUpdateItemKey(key: string, docId: string): boolean {
  return key.startsWith(`blocks-${docId}-update-`);
}

const testLocalStorage = async () => {
  const { config } = props.context;

  // 检查文档名是否填写
  const docName = config.id?.trim();
  if (!docName) {
    testResult.value = {
      status: "error",
      message: "请先填写文档名",
    };
    return;
  }

  testing.value = true;
  testResult.value = null;

  try {
    const stateKey = getStateItemKey(docName);
    const stateStr = localStorage.getItem(stateKey);

    if (stateStr === null) {
      // 检查是否有更新文件但没有状态文件（数据损坏的情况）
      const hasUpdates = Object.keys(localStorage).some((key) =>
        isUpdateItemKey(key, docName)
      );

      if (hasUpdates) {
        testResult.value = {
          status: "error",
          message: "发现更新文件但缺少状态文件，知识库数据可能已损坏",
        };
      } else {
        testResult.value = {
          status: "not_found",
          message: "没有找到指定知识库，将创建一个空知识库",
        };
      }
      return;
    }

    // 尝试加载文档并计算块数量
    const state = base64ToUint8Array(stateStr);

    // 收集所有更新
    const updates: Uint8Array[] = [];
    for (const key of Object.keys(localStorage)) {
      if (isUpdateItemKey(key, docName)) {
        const value = localStorage.getItem(key)!;
        updates.push(base64ToUint8Array(value));
      }
    }

    // 创建文档并导入数据
    const doc = new LoroDoc();
    doc.importBatch([state, ...updates]);
    const tree = doc.getTree(BLOCKS_TREE_NAME);

    if (!tree) {
      testResult.value = {
        status: "error",
        message: "知识库数据格式无效",
      };
      return;
    }

    const nodes = tree.getNodes({ withDeleted: false });
    const blockCount = nodes?.length || 0;

    testResult.value = {
      status: "found",
      message: `找到指定知识库，包含 ${blockCount} 个块`,
      blockCount,
    };
  } catch (error) {
    console.error("检测本地存储失败:", error);
    testResult.value = {
      status: "error",
      message:
        error instanceof Error
          ? `无效的知识库: ${error.message}`
          : "无效的知识库",
    };
  } finally {
    testing.value = false;
  }
};
</script>
