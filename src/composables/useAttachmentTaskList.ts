import { ref, computed, onMounted, onUnmounted } from "vue";
import type { App } from "@/lib/app/app";
import type {
  AttachmentTaskInfo,
  AttachmentTaskType,
  AttachmentTaskStatus,
  ProgressInfo,
} from "@/lib/app/attachment/storage";

// 使用 storage 中的类型
export type { AttachmentTaskType, AttachmentTaskStatus, ProgressInfo };
export type AttachmentTask = AttachmentTaskInfo;

// 全局任务列表 - 从 storage 事件同步
const tasks = ref<AttachmentTask[]>([]);

// 计算属性
const taskCounts = computed(() => {
  const counts = {
    total: tasks.value.length,
    pending: 0,
    progress: 0,
    success: 0,
    error: 0,
  };

  tasks.value.forEach((task) => {
    counts[task.status]++;
  });

  return counts;
});

const hasActiveTasks = computed(() => {
  return tasks.value.some(
    (task) => task.status === "pending" || task.status === "progress"
  );
});

const hasCompletedTasks = computed(() => {
  return tasks.value.some(
    (task) => task.status === "success" || task.status === "error"
  );
});

// 工具函数
export const getTaskTypeText = (type: AttachmentTaskType): string => {
  const typeMap: Record<AttachmentTaskType, string> = {
    upload: "上传",
    download: "下载",
    delete: "删除",
  };
  return typeMap[type] || type;
};

export const getTaskStatusText = (status: AttachmentTaskStatus): string => {
  const statusMap: Record<AttachmentTaskStatus, string> = {
    pending: "等待中",
    progress: "进行中",
    success: "已完成",
    error: "失败",
  };
  return statusMap[status] || status;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

// 主要的 composable 函数 - 接受 getApp 参数以访问 attachmentStorage
export const useAttachmentTaskList = (getApp?: () => App) => {
  // 事件监听器引用
  let eventListeners: Array<() => void> = [];

  // 初始化事件监听
  const initializeEventListeners = (app: App) => {
    const storage = app.attachmentStorage;

    // 监听任务创建
    const onTaskCreated = (task: AttachmentTask) => {
      tasks.value.push({ ...task });
    };

    // 监听任务开始
    const onTaskStarted = (task: AttachmentTask) => {
      const index = tasks.value.findIndex((t) => t.id === task.id);
      if (index > -1) {
        tasks.value[index] = { ...task };
      }
    };

    // 监听任务进度
    const onTaskProgress = (task: AttachmentTask) => {
      const index = tasks.value.findIndex((t) => t.id === task.id);
      if (index > -1) {
        tasks.value[index] = { ...task };
      }
    };

    // 监听任务完成
    const onTaskCompleted = (task: AttachmentTask) => {
      const index = tasks.value.findIndex((t) => t.id === task.id);
      if (index > -1) {
        tasks.value[index] = { ...task };
      }
    };

    // 监听任务失败
    const onTaskFailed = (task: AttachmentTask) => {
      const index = tasks.value.findIndex((t) => t.id === task.id);
      if (index > -1) {
        tasks.value[index] = { ...task };
      }
    };

    // 注册事件监听器
    storage.on("task:created", onTaskCreated);
    storage.on("task:started", onTaskStarted);
    storage.on("task:progress", onTaskProgress);
    storage.on("task:completed", onTaskCompleted);
    storage.on("task:failed", onTaskFailed);

    // 保存清理函数
    eventListeners = [
      () => storage.off("task:created", onTaskCreated),
      () => storage.off("task:started", onTaskStarted),
      () => storage.off("task:progress", onTaskProgress),
      () => storage.off("task:completed", onTaskCompleted),
      () => storage.off("task:failed", onTaskFailed),
    ];

    // 初始化时同步现有的活跃任务
    const activeTasks = storage.getActiveTasks();
    tasks.value.push(...activeTasks);
  };

  // 如果提供了 getApp 函数，在挂载时初始化事件监听
  if (getApp) {
    onMounted(() => {
      try {
        const app = getApp();
        initializeEventListeners(app);
      } catch (error) {
        console.warn("Failed to initialize attachment task list:", error);
      }
    });

    // 在卸载时清理事件监听器
    onUnmounted(() => {
      eventListeners.forEach((cleanup) => cleanup());
      eventListeners = [];
    });
  }

  // 获取任务
  const getTask = (taskId: string): AttachmentTask | undefined => {
    return tasks.value.find((task) => task.id === taskId);
  };

  // 移除任务（仅从本地列表中移除）
  const removeTask = (taskId: string): void => {
    const index = tasks.value.findIndex((task) => task.id === taskId);
    if (index > -1) {
      tasks.value.splice(index, 1);
    }
  };

  // 清空所有任务（仅从本地列表中清空）
  const clearAllTasks = (): void => {
    tasks.value = [];
  };

  // 清空已完成的任务
  const clearCompletedTasks = (): void => {
    tasks.value = tasks.value.filter(
      (task) => task.status !== "success" && task.status !== "error"
    );
  };

  // 清空特定状态的任务
  const clearTasksByStatus = (status: AttachmentTaskStatus): void => {
    tasks.value = tasks.value.filter((task) => task.status !== status);
  };

  return {
    // 状态
    tasks,
    taskCounts,
    hasActiveTasks,
    hasCompletedTasks,

    // 任务查询方法
    getTask,

    // 本地任务管理方法（仅影响显示列表）
    removeTask,
    clearAllTasks,
    clearCompletedTasks,
    clearTasksByStatus,

    // 工具函数
    getTaskTypeText,
    getTaskStatusText,
    formatFileSize,
  };
};
