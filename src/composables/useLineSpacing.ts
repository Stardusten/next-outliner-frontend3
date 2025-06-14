import { computed, watch, type Ref } from "vue";
import { useLocalStorage } from "./useLocalStorage";

export type LineSpacing = "compact" | "normal" | "loose";

export const LINE_SPACING_OPTIONS: Record<
  LineSpacing,
  {
    label: string;
  }
> = {
  compact: {
    label: "紧凑",
  },
  normal: {
    label: "正常",
  },
  loose: {
    label: "宽松",
  },
};

/**
 * 行间距管理 composable
 */
export function useLineSpacing(storageKey = "line-spacing-preference") {
  // 获取初始值，确保类型安全
  const getInitialValue = (): LineSpacing => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (parsed === "compact" || parsed === "normal" || parsed === "loose") {
          return parsed;
        }
      }
    } catch {
      // 如果解析失败，使用默认值
    }
    return "normal";
  };

  const [spacing, setSpacing] = useLocalStorage<LineSpacing>(storageKey, getInitialValue());

  // 确保值的类型安全
  const currentSpacing = computed<LineSpacing>(() => {
    if (spacing.value === "compact" || spacing.value === "normal" || spacing.value === "loose") {
      return spacing.value;
    }
    return "normal";
  });

  // 获取当前配置
  const currentConfig = computed(() => {
    return LINE_SPACING_OPTIONS[currentSpacing.value];
  });

  // 应用行间距类到DOM
  const applySpacing = (spacingValue: LineSpacing): void => {
    const root = document.documentElement;

    // 移除所有行间距类
    Object.keys(LINE_SPACING_OPTIONS).forEach((key) => {
      root.classList.remove(`spacing-${key}`);
    });

    // 添加当前行间距类
    root.classList.add(`spacing-${spacingValue}`);
  };

  // 设置行间距
  const setLineSpacing = (value: LineSpacing): void => {
    setSpacing(value);
  };

  // 切换到下一个行间距
  const cycle = (): void => {
    const options: LineSpacing[] = ["compact", "normal", "loose"];
    const currentIndex = options.indexOf(currentSpacing.value);
    const nextIndex = (currentIndex + 1) % options.length;
    setLineSpacing(options[nextIndex]);
  };

  // 检查是否为特定行间距
  const isCompact = computed(() => currentSpacing.value === "compact");
  const isNormal = computed(() => currentSpacing.value === "normal");
  const isLoose = computed(() => currentSpacing.value === "loose");

  // 监听变化并应用到DOM
  watch(
    currentSpacing,
    (newSpacing) => {
      applySpacing(newSpacing);
    },
    { immediate: true },
  );

  return {
    // 状态
    current: currentSpacing as Ref<LineSpacing>,
    config: currentConfig,
    isCompact: isCompact as Ref<boolean>,
    isNormal: isNormal as Ref<boolean>,
    isLoose: isLoose as Ref<boolean>,

    // 方法
    setSpacing: setLineSpacing,
    setCompact: () => setLineSpacing("compact"),
    setNormal: () => setLineSpacing("normal"),
    setLoose: () => setLineSpacing("loose"),
    cycle,

    // 常量
    options: LINE_SPACING_OPTIONS,
  };
}
