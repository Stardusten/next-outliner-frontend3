import { ref, reactive } from "vue";
import { nanoid } from "nanoid";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  timestamp: number;
}

export interface ToastOptions {
  title?: string;
  duration?: number;
  type?: ToastType;
}

// 全局 toast 状态
const toasts = ref<ToastItem[]>([]);
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

// 默认配置
const DEFAULT_DURATION = 4000;

// 添加 toast
const addToast = (message: string, options: ToastOptions = {}): string => {
  const id = nanoid();
  const duration = options.duration ?? DEFAULT_DURATION;

  const toast: ToastItem = {
    id,
    type: options.type ?? "info",
    title: options.title,
    message,
    duration,
    timestamp: Date.now(),
  };

  toasts.value.push(toast);

  // 自动移除
  if (duration > 0) {
    const timeout = setTimeout(() => {
      removeToast(id);
    }, duration);
    timeouts.set(id, timeout);
  }

  return id;
};

// 移除 toast
const removeToast = (id: string) => {
  const index = toasts.value.findIndex((toast) => toast.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }

  // 清除定时器
  const timeout = timeouts.get(id);
  if (timeout) {
    clearTimeout(timeout);
    timeouts.delete(id);
  }
};

// 清空所有 toast
const clearToasts = () => {
  // 清除所有定时器
  timeouts.forEach((timeout) => clearTimeout(timeout));
  timeouts.clear();
  toasts.value = [];
};

// 便捷方法
const success = (message: string, options: Omit<ToastOptions, "type"> = {}) => {
  return addToast(message, { ...options, type: "success" });
};

const error = (message: string, options: Omit<ToastOptions, "type"> = {}) => {
  return addToast(message, { ...options, type: "error" });
};

const warning = (message: string, options: Omit<ToastOptions, "type"> = {}) => {
  return addToast(message, { ...options, type: "warning" });
};

const info = (message: string, options: Omit<ToastOptions, "type"> = {}) => {
  return addToast(message, { ...options, type: "info" });
};

// useToast 的主要 hook
export function useToast() {
  return {
    // 状态
    toasts: toasts,

    // 方法
    add: addToast,
    remove: removeToast,
    clear: clearToasts,

    // 便捷方法
    success,
    error,
    warning,
    info,
  };
}

// 全局 toast 管理器（用于非组件环境）
export const toast = {
  add: addToast,
  remove: removeToast,
  clear: clearToasts,
  success,
  error,
  warning,
  info,
};
