import { ref, computed, readonly } from "vue";
import { useRoute, useRouter } from "vue-router";
import { z } from "zod";
import { toast } from "vue-sonner";
import { repoConfigSchema, type RepoConfig } from "@/lib/repo/schema";

const REPO_CONFIGS_STORAGE_KEY = "repo-configs";
const _configs = ref<RepoConfig[]>([]);
let _initialized = false;

// 迁移旧配置结构
const migrateOldConfig = (oldConfig: any): any => {
  const migrated = { ...oldConfig };

  // 迁移 attachment 结构
  if (oldConfig.attachment && oldConfig.attachment.type) {
    if (oldConfig.attachment.type === "r2" && oldConfig.attachment.params) {
      migrated.attachment = {
        storageType: "oss",
        endpoint: oldConfig.attachment.params.endpoint || "",
        bucket: oldConfig.attachment.params.bucket || "",
        accessKeyId: oldConfig.attachment.params.accessKeyId || "",
        secretAccessKey: oldConfig.attachment.params.secretAccessKey || "",
      };
    } else {
      migrated.attachment = {
        storageType: "none",
        endpoint: "",
        bucket: "",
        accessKeyId: "",
        secretAccessKey: "",
      };
    }
  }

  return migrated;
};

// 从 localStorage 加载配置
const loadConfigsFromStorage = (): void => {
  const stored = localStorage.getItem(REPO_CONFIGS_STORAGE_KEY);
  if (!stored) {
    _configs.value = [];
    return;
  }

  try {
    const rawData = JSON.parse(stored);
    if (!Array.isArray(rawData)) {
      throw new Error("Invalid config format");
    }

    // 尝试迁移和验证每个配置
    const migratedConfigs = rawData.map(migrateOldConfig);
    const validConfigs: RepoConfig[] = [];

    for (const config of migratedConfigs) {
      const res = repoConfigSchema.safeParse(config);
      if (res.success) {
        validConfigs.push(res.data);
      } else {
        console.warn("跳过无效配置:", config, res.error);
      }
    }

    _configs.value = validConfigs;

    // 如果有迁移，保存新格式
    if (validConfigs.length > 0) {
      saveConfigsToStorage();
    }
  } catch (error) {
    console.error("加载配置失败:", error);
    _configs.value = [];
    saveConfigsToStorage();
    toast.error("加载知识库配置失败，已重置配置列表");
  }

  // 按 ID 字母排序
  _configs.value.sort((a, b) => a.id.localeCompare(b.id));
};

// 保存配置到 localStorage
const saveConfigsToStorage = (): void => {
  try {
    localStorage.setItem(
      REPO_CONFIGS_STORAGE_KEY,
      JSON.stringify(_configs.value)
    );
  } catch (error) {
    console.error("保存知识库配置失败:", error);
    toast.error("保存知识库配置失败");
  }
};

export const useRepoConfigs = () => {
  // 确保只初始化一次，并且在组件内部
  if (!_initialized) {
    _initialized = true;
    loadConfigsFromStorage();
  }

  const router = useRouter();
  const route = useRoute();
  const configs = readonly(_configs);

  // 重新加载配置
  const loadConfigs = () => {
    loadConfigsFromStorage();
  };

  // 添加或更新知识库配置
  const addConfig = (config: RepoConfig): void => {
    // 检查是否已存在
    const existingIndex = _configs.value.findIndex((c) => c.id === config.id);

    if (existingIndex >= 0) {
      // 更新现有配置
      _configs.value[existingIndex] = config;
      // toast.success(`已更新知识库 ${config.title}`);
    } else {
      // 添加新配置
      _configs.value.push(config);
      toast.success(`已添加知识库 ${config.title}`);
    }

    // 重新排序并保存
    _configs.value.sort((a, b) => a.id.localeCompare(b.id));
    saveConfigsToStorage();
  };

  // 删除知识库配置
  const removeConfig = (repoId: string): boolean => {
    const config = getConfig(repoId);
    const initialLength = _configs.value.length;
    _configs.value = _configs.value.filter((config) => config.id !== repoId);

    if (_configs.value.length !== initialLength) {
      saveConfigsToStorage();
      toast.success(`已删除知识库 ${config?.title || repoId}`);
      return true;
    }
    return false;
  };

  // 获取指定知识库配置
  const getConfig = (repoId: string): RepoConfig | null => {
    return _configs.value.find((config) => config.id === repoId) || null;
  };

  // 清空所有配置
  const clearAllConfigs = (): void => {
    _configs.value = [];
    localStorage.removeItem(REPO_CONFIGS_STORAGE_KEY);
    toast.success("已清空所有知识库配置");
  };

  // 打开知识库
  const openRepo = (repoId: string) => {
    const config = getConfig(repoId);
    const res = repoConfigSchema.safeParse(config);
    if (res.success) {
      router.push(`/edit/${repoId}`);
    } else {
      toast.error("知识库配置无效");
    }
  };

  const currentRepo = computed(() => {
    const repoId = route.params.repoId as string;
    return getConfig(repoId);
  });

  return {
    // 状态
    configs,
    currentRepo,

    // 方法
    loadConfigs,
    addConfig,
    removeConfig,
    getConfig,
    clearAllConfigs,
    openRepo,
  };
};
