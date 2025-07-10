import { ref, computed, readonly } from "vue";
import { useRoute, useRouter } from "vue-router";
import { z } from "zod";
import { toast } from "vue-sonner";
import { repoConfigSchema, type RepoConfig } from "@/lib/repo/schema";

const REPO_CONFIGS_STORAGE_KEY = "repo-configs";
const _configs = ref<RepoConfig[]>([]);

// 从 localStorage 加载配置
const loadConfigsFromStorage = (): void => {
  const stored = localStorage.getItem(REPO_CONFIGS_STORAGE_KEY);
  if (!stored) {
    _configs.value = [];
    return;
  }

  const schema = z
    .string()
    .transform((val) => JSON.parse(val))
    .pipe(z.array(repoConfigSchema));

  const res = schema.safeParse(stored);
  if (res.success) {
    _configs.value = res.data;
  } else {
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

// 初始化加载配置
loadConfigsFromStorage();

export const useRepoConfigs = () => {
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
      toast.success(`已更新知识库 ${config.title}`);
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
