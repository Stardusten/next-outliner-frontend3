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
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { LoaderIcon, CheckIcon, XIcon } from "lucide-vue-next";
import { R2AttachmentStorage } from "@/lib/app/attachment/r2-browser";
import type { SettingRenderContext } from "@/composables/useSettings";

interface Props {
  context: SettingRenderContext;
}

const props = defineProps<Props>();

const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

const testConnection = async () => {
  const { settings } = props.context;

  // 检查必填配置
  const requiredFields = [
    "ossEndpoint",
    "ossAccessKey",
    "ossSecretKey",
    "ossBucket",
  ];
  const missingFields = requiredFields.filter((field) => !settings[field]);

  if (missingFields.length > 0) {
    testResult.value = {
      success: false,
      message: `请先填写：${missingFields
        .map((f) => {
          switch (f) {
            case "ossEndpoint":
              return "Endpoint";
            case "ossAccessKey":
              return "Access Key";
            case "ossSecretKey":
              return "Secret Key";
            case "ossBucket":
              return "Bucket";
            default:
              return f;
          }
        })
        .join(", ")}`,
    };
    return;
  }

  testing.value = true;
  testResult.value = null;

  try {
    const config = {
      endpoint: settings.ossEndpoint,
      bucket: settings.ossBucket,
      accessKeyId: settings.ossAccessKey,
      secretAccessKey: settings.ossSecretKey,
    };

    const result = await R2AttachmentStorage.test_conn(config);
    testResult.value = result;
  } catch (error) {
    testResult.value = {
      success: false,
      message: error instanceof Error ? error.message : "测试失败",
    };
  } finally {
    testing.value = false;
  }
};
</script>
