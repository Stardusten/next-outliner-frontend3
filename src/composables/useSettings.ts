import {
  Brain,
  Database,
  Folder,
  FolderCog,
  Info,
  PaintRoller,
  Settings,
} from "lucide-vue-next";
import { computed, reactive, ref, watch, type Component } from "vue";

// 设置项类型
export type SettingType =
  | "toggle"
  | "single-select"
  | "multi-select"
  | "input"
  | "number"
  | "font";

// 选项类型
export interface SettingOption {
  id: string;
  label: string;
  description?: string;
}

// 基础设置项接口
export interface BaseSetting {
  id: string;
  type: SettingType;
  label: string;
  description?: string;
  storageKey: string; // localStorage 键名
}

// Toggle 设置项
export interface ToggleSetting extends BaseSetting {
  type: "toggle";
  defaultValue: boolean;
}

// 单选设置项
export interface SingleSelectSetting extends BaseSetting {
  type: "single-select";
  defaultValue: string;
  options: SettingOption[];
}

// 多选设置项
export interface MultiSelectSetting extends BaseSetting {
  type: "multi-select";
  defaultValue: string[];
  options: SettingOption[];
}

// 输入框设置项
export interface InputSetting extends BaseSetting {
  type: "input";
  defaultValue: string;
  placeholder?: string;
  hidden?: boolean;
  maxLength?: number;
}

// 数字设置项
export interface NumberSetting extends BaseSetting {
  type: "number";
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
}

// 字体设置项
export interface FontSetting extends BaseSetting {
  type: "font";
  defaultValue: string;
  fontList?: string[]; // 可选的自定义字体列表
}

// 联合类型
export type SettingItem =
  | ToggleSetting
  | SingleSelectSetting
  | MultiSelectSetting
  | InputSetting
  | NumberSetting
  | FontSetting;

// 设置分组
export interface SettingsGroup {
  id: string;
  title: string;
  description?: string;
  settings: SettingItem[];
}

// 设置页面
export interface SettingsPageConfig {
  id: string;
  groups: SettingsGroup[];
}

// 侧边栏项
export interface SidebarSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon?: Component;
  }[];
}

// 设置配置
const settingsConfig: SettingsPageConfig[] = [
  {
    id: "appearance",
    groups: [
      {
        id: "ui",
        title: "UI",
        settings: [
          {
            id: "theme",
            type: "single-select",
            label: "颜色主题",
            storageKey: "theme",
            defaultValue: "light",
            options: [
              { id: "light", label: "Light" },
              { id: "dark", label: "Dark" },
              { id: "system", label: "System" },
            ],
          },
          {
            id: "uiFontSize",
            type: "number",
            label: "UI 字体大小",
            storageKey: "uiFontSize",
            defaultValue: 16,
            min: 12,
            max: 24,
          },
          {
            id: "uiFontFamily",
            type: "font",
            label: "UI 字体",
            storageKey: "uiFontFamily",
            defaultValue: "Inter",
          },
          {
            id: "uiScale",
            type: "number",
            label: "UI 缩放比例",
            storageKey: "uiScale",
            defaultValue: 100,
            min: 50,
            max: 200,
          },
        ],
      },
      {
        id: "editor",
        title: "编辑器",
        settings: [
          {
            id: "editorLineSpacing",
            type: "single-select",
            label: "行间距",
            storageKey: "editorLineSpacing",
            defaultValue: "normal",
            options: [
              { id: "compact", label: "Compact" },
              { id: "normal", label: "Normal" },
              { id: "loose", label: "Loose" },
            ],
          },
          {
            id: "editorFontSize",
            type: "number",
            label: "编辑器字体大小",
            storageKey: "editorFontSize",
            defaultValue: 16,
            min: 12,
            max: 24,
            step: 1,
          },
          {
            id: "editorFontFamily",
            type: "font",
            label: "编辑器文本字体",
            storageKey: "editorFontFamily",
            defaultValue: "Inter",
          },
          {
            id: "editorMonospaceFontSize",
            type: "number",
            label: "编辑器等宽字体大小",
            storageKey: "editorMonospaceFontSize",
            defaultValue: 16,
            min: 12,
          },
          {
            id: "editorMonospaceFontFamily",
            type: "font",
            label: "编辑器等宽字体",
            storageKey: "editorMonospaceFontFamily",
            defaultValue: "Inter",
          },
        ],
      },
    ],
  },
  {
    id: "editor",
    groups: [
      {
        id: "upload",
        title: "附件默认显示模式",
        description:
          "编辑器中，一个附件可以显示为 (1) 引用 (2) 卡片 (3) 嵌入预览。下面的设置项目用于指定不同类型的文件，上传时的默认显示模式。",
        settings: [
          {
            id: "imageFileDefaultDisplayMode",
            type: "single-select",
            label: "图片文件",
            storageKey: "imageFileDefaultDisplayMode",
            defaultValue: "preview",
            options: [
              { id: "inline", label: "引用" },
              { id: "expanded", label: "卡片" },
              { id: "preview", label: "嵌入预览" },
            ],
          },
          {
            id: "videoFileDefaultDisplayMode",
            type: "single-select",
            label: "视频文件",
            storageKey: "videoFileDefaultDisplayMode",
            defaultValue: "preview",
            options: [
              { id: "inline", label: "引用" },
              { id: "expanded", label: "卡片" },
              { id: "preview", label: "嵌入预览" },
            ],
          },
          {
            id: "audioFileDefaultDisplayMode",
            type: "single-select",
            label: "音频文件",
            storageKey: "audioFileDefaultDisplayMode",
            defaultValue: "preview",
            options: [
              { id: "inline", label: "引用" },
              { id: "expanded", label: "卡片" },
              { id: "preview", label: "嵌入预览" },
            ],
          },
          {
            id: "textFileDefaultDisplayMode",
            type: "single-select",
            label: "文本文件",
            storageKey: "textFileDefaultDisplayMode",
            defaultValue: "expanded",
            options: [
              { id: "inline", label: "引用" },
              { id: "expanded", label: "卡片" },
              { id: "preview", label: "嵌入预览" },
            ],
          },
          {
            id: "archiveFileDefaultDisplayMode",
            type: "single-select",
            label: "压缩文件",
            storageKey: "archiveFileDefaultDisplayMode",
            defaultValue: "expanded",
            options: [
              { id: "inline", label: "引用" },
              { id: "expanded", label: "卡片" },
              { id: "preview", label: "嵌入预览" },
            ],
          },
          {
            id: "unknownFileDefaultDisplayMode",
            type: "single-select",
            label: "未知文件",
            storageKey: "unknownFileDefaultDisplayMode",
            defaultValue: "expanded",
            options: [
              { id: "inline", label: "引用" },
              { id: "expanded", label: "卡片" },
              { id: "preview", label: "嵌入预览" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "attachment",
    groups: [
      {
        id: "对象存储",
        title: "对象存储",
        description:
          "Next Outliner 使用对象存储来存储附件，请在下面指定你的对象存储服务的信息。注意：如果知识库中已上传附件不在指定的对象存储服务中，则这些附件将无法访问。",
        settings: [
          {
            id: "ossEndpoint",
            type: "input",
            label: "对象存储服务地址",
            storageKey: "ossEndpoint",
            defaultValue: "",
          },
          {
            id: "ossAccessKey",
            type: "input",
            label: "对象存储 Access Key",
            storageKey: "ossAccessKey",
            defaultValue: "",
            hidden: true,
          },
          {
            id: "ossSecretKey",
            type: "input",
            label: "对象存储 Secret Key",
            storageKey: "ossSecretKey",
            defaultValue: "",
            hidden: true,
          },
          {
            id: "ossBucket",
            type: "input",
            label: "存储桶名",
            storageKey: "ossBucket",
            defaultValue: "",
          },
        ],
      },
    ],
  },
  {
    id: "about",
    groups: [],
  },
];

// 侧边栏配置
const sidebarSections: SidebarSection[] = [
  {
    title: "Settings",
    items: [
      { id: "appearance", label: "外观", icon: PaintRoller },
      { id: "editor", label: "编辑器", icon: Settings },
      { id: "database", label: "知识库", icon: Database },
      { id: "attachment", label: "附件", icon: Folder },
      { id: "ai", label: "AI", icon: Brain },
      { id: "about", label: "软件信息", icon: Info },
    ],
  },
];

// 全局状态
const visible = ref(false);
const currentPage = ref(settingsConfig[0]?.id || "");
const settings = reactive<Record<string, any>>({});

// 初始化标志
let initialized = false;

// 从 localStorage 加载设置
const loadSettings = () => {
  settingsConfig.forEach((page) => {
    page.groups.forEach((group) => {
      group.settings.forEach((setting) => {
        const stored = localStorage.getItem(setting.storageKey);
        if (stored !== null) {
          try {
            settings[setting.storageKey] = JSON.parse(stored);
          } catch {
            settings[setting.storageKey] = stored;
          }
        } else {
          settings[setting.storageKey] = setting.defaultValue;
        }
      });
    });
  });
};

// 保存设置到 localStorage
const saveSetting = (storageKey: string, value: any) => {
  console.log("saveSetting", storageKey, value);
  settings[storageKey] = value;
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    localStorage.setItem(storageKey, String(value));
  }
};

// 获取设置值
const getSetting = (storageKey: string) => settings[storageKey];

// 重置设置为默认值
const resetSetting = (storageKey: string) => {
  const setting = findSettingByStorageKey(storageKey);
  if (setting) {
    saveSetting(storageKey, setting.defaultValue);
  }
};

// 根据 storageKey 查找设置项
const findSettingByStorageKey = (storageKey: string): SettingItem | null => {
  for (const page of settingsConfig) {
    for (const group of page.groups) {
      for (const setting of group.settings) {
        if (setting.storageKey === storageKey) {
          return setting;
        }
      }
    }
  }
  return null;
};

// 初始化副作用
const initEffects = () => {
  if (initialized) return;
  initialized = true;

  // 主题效果
  const root = document.documentElement;
  const applyTheme = (themeValue: string) => {
    switch (themeValue) {
      case "light":
        root.classList.remove("dark");
        break;
      case "dark":
        root.classList.add("dark");
        break;
      case "system":
      default:
        const isDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        root.classList.toggle("dark", isDark);
        break;
    }
  };

  watch(() => settings.theme, applyTheme, { immediate: true });

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", (e) => {
    if (settings.theme === "system") {
      root.classList.toggle("dark", e.matches);
    }
  });

  // 行间距效果
  const spacingClasses = ["compact", "normal", "loose"];
  const applySpacing = (spacing: string) => {
    spacingClasses.forEach((cls) => root.classList.remove(`spacing-${cls}`));
    if (spacing && spacingClasses.includes(spacing)) {
      root.classList.add(`spacing-${spacing}`);
    }
  };

  watch(() => settings.editorLineSpacing, applySpacing, { immediate: true });
};

export function useSettings() {
  // 初始化设置（只在第一次调用时执行）
  if (!initialized) {
    loadSettings();
    initEffects();
  }

  // 计算属性
  const currentPageConfig = computed(() => {
    return settingsConfig.find((page) => page.id === currentPage.value);
  });

  return {
    // 响应式状态
    visible,
    currentPage,
    settings,

    // 计算属性
    currentPageConfig,

    // 配置
    sidebarSections,
    settingsConfig,

    // 工具方法
    getSetting,
    saveSetting,
    resetSetting,
  };
}
