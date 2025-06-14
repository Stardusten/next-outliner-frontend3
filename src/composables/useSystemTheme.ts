import { ref, onMounted, onUnmounted, type Ref } from "vue";

// 全局单例实例
let systemThemeInstance: ReturnType<typeof createSystemTheme> | null = null;

function createSystemTheme(): {
  isDark: Ref<boolean>;
  isLight: Ref<boolean>;
} {
  const isDark = ref(false);
  const isLight = ref(true);

  let mediaQuery: MediaQueryList | null = null;

  // 检测当前系统主题
  const detectSystemTheme = (): boolean => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  };

  // 处理系统主题变化
  const handleThemeChange = (e: MediaQueryListEvent): void => {
    isDark.value = e.matches;
    isLight.value = !e.matches;
  };

  // 更新当前状态
  const updateTheme = (): void => {
    const darkMode = detectSystemTheme();
    isDark.value = darkMode;
    isLight.value = !darkMode;
  };

  onMounted(() => {
    if (typeof window !== "undefined") {
      // 初始化
      updateTheme();

      // 监听系统主题变化
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", handleThemeChange);
    }
  });

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener("change", handleThemeChange);
      mediaQuery = null;
    }
  });

  return {
    isDark,
    isLight,
  };
}

/**
 * 检测和监听系统主题偏好的 composable
 */
export function useSystemTheme(): {
  isDark: Ref<boolean>;
  isLight: Ref<boolean>;
} {
  if (!systemThemeInstance) {
    systemThemeInstance = createSystemTheme();
  }
  return systemThemeInstance;
}
