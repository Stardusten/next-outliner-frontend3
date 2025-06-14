import { computed, watch, ref, type Ref } from "vue";
import { useLocalStorage } from "./useLocalStorage";
import { useSystemTheme } from "./useSystemTheme";

export type ThemeMode = "light" | "dark" | "system";

// 全局单例实例
let themeInstance: ReturnType<typeof createTheme> | null = null;

function createTheme(storageKey = "theme-preference") {
  const systemTheme = useSystemTheme();

  // 检查是否有用户设置
  const checkUserPreference = (): boolean => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  };

  // 用响应式状态跟踪是否有用户偏好
  const hasUserPreference = ref(checkUserPreference());

  // 获取初始默认值
  const getInitialValue = (): boolean => {
    if (hasUserPreference.value) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          return Boolean(parsed);
        }
      } catch {
        // 解析失败时使用系统主题
        return systemTheme.isDark.value;
      }
    }
    // 没有用户设置时使用系统主题
    return systemTheme.isDark.value;
  };

  const [userPreference, setUserPreference] = useLocalStorage(storageKey, getInitialValue());

  // 当前实际应用的主题
  const isDark = computed(() => {
    if (hasUserPreference.value) {
      return Boolean(userPreference.value);
    }
    return systemTheme.isDark.value;
  });

  const isLight = computed(() => !isDark.value);

  // 应用主题到DOM
  const applyTheme = (dark: boolean): void => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("theme-dark");
      root.classList.remove("theme-light");
    } else {
      root.classList.add("theme-light");
      root.classList.remove("theme-dark");
    }
  };

  // 切换主题
  const toggle = (): void => {
    hasUserPreference.value = true;
    setUserPreference(!userPreference.value);
  };

  // 设置特定主题
  const setTheme = (dark: boolean): void => {
    hasUserPreference.value = true;
    setUserPreference(dark);
  };

  // 设置为亮色主题
  const setLight = (): void => {
    setTheme(false);
  };

  // 设置为暗色主题
  const setDark = (): void => {
    setTheme(true);
  };

  // 清除用户偏好，跟随系统主题
  const clearUserPreference = (): void => {
    try {
      localStorage.removeItem(storageKey);
      hasUserPreference.value = false;
    } catch (error) {
      console.warn(`Failed to clear localStorage key "${storageKey}":`, error);
    }
  };

  // 是否正在跟随系统主题
  const isFollowingSystem = computed(() => !hasUserPreference.value);

  // 监听主题变化并应用到DOM
  watch(
    isDark,
    (dark) => {
      applyTheme(dark);
    },
    { immediate: true },
  );

  // 当没有用户偏好时，监听系统主题变化
  watch(
    [systemTheme.isDark, hasUserPreference],
    ([systemIsDark, hasPreference]) => {
      if (!hasPreference) {
        // 没有用户偏好时，跟随系统主题变化
        applyTheme(systemIsDark);
      }
    },
    { immediate: true },
  );

  return {
    // 状态
    isDark: isDark as Ref<boolean>,
    isLight: isLight as Ref<boolean>,
    isFollowingSystem: isFollowingSystem as Ref<boolean>,
    userPreference,
    systemTheme: systemTheme.isDark,
    hasUserPreference,

    // 方法
    toggle,
    setTheme,
    setLight,
    setDark,
    clearUserPreference,
  };
}

/**
 * 主题管理 composable
 */
export function useTheme(storageKey = "theme-preference") {
  if (!themeInstance) {
    themeInstance = createTheme(storageKey);
  }
  return themeInstance;
}
