import * as Minio from "minio";
import type {
  AttachmentStorage,
  AttachmentId,
  AttachmentMetadata,
  TaskId,
  Task,
  UploadTask,
  DownloadTask,
  DeleteTask,
  TaskStatus,
  TaskFilterOptions,
  TaskEvent,
  TaskEventListener,
} from "./interface";

/**
 * S3 存储配置
 */
export interface S3Config {
  /** S3 服务端点 */
  endPoint: string;
  /** 端口 */
  port?: number;
  /** 是否使用 SSL */
  useSSL?: boolean;
  /** Access Key */
  accessKey: string;
  /** Secret Key */
  secretKey: string;
  /** 存储桶名称 */
  bucketName: string;
  /** 区域 */
  region?: string;
}

/**
 * 内部任务控制器
 */
interface TaskController {
  abort(): void;
}

/**
 * 基于 Minio 的 S3 存储实现
 */
export class S3AttachmentStorage implements AttachmentStorage {
  private minioClient: Minio.Client;
  private bucketName: string;
  private tasks = new Map<TaskId, Task>();
  private taskControllers = new Map<TaskId, TaskController>();
  private eventListeners: TaskEventListener[] = [];

  constructor(config: S3Config) {
    this.minioClient = new Minio.Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL ?? true,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      region: config.region,
    });
    this.bucketName = config.bucketName;
    this.initializeBucket();
  }

  /**
   * 初始化存储桶
   */
  private async initializeBucket(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName);
      }
    } catch (error) {
      console.error("Failed to initialize bucket:", error);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * 触发事件
   */
  private emitEvent(event: TaskEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in event listener:", error);
      }
    });
  }

  /**
   * 更新任务状态
   */
  private updateTask(taskId: TaskId, updates: Partial<Task>): void {
    const task = this.tasks.get(taskId);
    if (task) {
      Object.assign(task, updates);
      this.tasks.set(taskId, task);
    }
  }

  /**
   * 从文件名中提取附件ID
   */
  private getAttachmentIdFromKey(key: string): AttachmentId {
    return key.split("/").pop() || key;
  }

  /**
   * 从附件ID生成对象键
   */
  private getObjectKey(attachmentId: AttachmentId): string {
    return `attachments/${attachmentId}`;
  }

  /**
   * 添加上传任务
   */
  async addUploadTask(file: File): Promise<TaskId> {
    const taskId = this.generateId();
    const attachmentId = this.generateId();

    const task: UploadTask = {
      id: taskId,
      type: "upload",
      status: "pending",
      createdAt: new Date(),
      progress: 0,
      file,
    };

    this.tasks.set(taskId, task);
    this.emitEvent({ type: "created", task });

    // 异步执行上传
    this.executeUploadTask(taskId, attachmentId);

    return taskId;
  }

  /**
   * 执行上传任务
   */
  private async executeUploadTask(
    taskId: TaskId,
    attachmentId: AttachmentId
  ): Promise<void> {
    const task = this.tasks.get(taskId) as UploadTask;
    if (!task) return;

    try {
      this.updateTask(taskId, {
        status: "running",
        startedAt: new Date(),
        progress: 0,
      });
      this.emitEvent({ type: "started", taskId });

      const objectKey = this.getObjectKey(attachmentId);

      // 将 File 转换为 Buffer
      const arrayBuffer = await task.file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 创建可取消的控制器
      const controller = new AbortController();
      this.taskControllers.set(taskId, { abort: () => controller.abort() });

      // 执行上传
      await this.minioClient.putObject(
        this.bucketName,
        objectKey,
        buffer,
        task.file.size,
        {
          "Content-Type": task.file.type,
          "Content-Length": task.file.size.toString(),
        }
      );

      // 模拟进度更新（实际实现中可以使用 minio 的进度回调）
      this.updateTask(taskId, { progress: 100 });
      this.emitEvent({ type: "progress", taskId, progress: 100 });

      const result: AttachmentMetadata = {
        id: attachmentId,
        filename: task.file.name,
        mimeType: task.file.type,
        size: task.file.size,
        uploadedAt: new Date(),
      };

      this.updateTask(taskId, {
        status: "completed",
        completedAt: new Date(),
        result,
      });

      this.emitEvent({ type: "completed", taskId, result });
      this.taskControllers.delete(taskId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";

      this.updateTask(taskId, {
        status: "failed",
        completedAt: new Date(),
        error: errorMessage,
      });

      this.emitEvent({ type: "failed", taskId, error: errorMessage });
      this.taskControllers.delete(taskId);
    }
  }

  /**
   * 添加下载任务
   */
  async addDownloadTask(attachmentId: AttachmentId): Promise<TaskId> {
    const taskId = this.generateId();

    const task: DownloadTask = {
      id: taskId,
      type: "download",
      status: "pending",
      createdAt: new Date(),
      progress: 0,
      attachmentId,
    };

    this.tasks.set(taskId, task);
    this.emitEvent({ type: "created", task });

    // 异步执行下载
    this.executeDownloadTask(taskId);

    return taskId;
  }

  /**
   * 执行下载任务
   */
  private async executeDownloadTask(taskId: TaskId): Promise<void> {
    const task = this.tasks.get(taskId) as DownloadTask;
    if (!task) return;

    try {
      this.updateTask(taskId, {
        status: "running",
        startedAt: new Date(),
        progress: 0,
      });
      this.emitEvent({ type: "started", taskId });

      const objectKey = this.getObjectKey(task.attachmentId);

      // 创建可取消的控制器
      const controller = new AbortController();
      this.taskControllers.set(taskId, { abort: () => controller.abort() });

      // 获取对象数据
      const stream = await this.minioClient.getObject(
        this.bucketName,
        objectKey
      );

      // 将流转换为 Blob
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const result = new Blob(chunks);

      this.updateTask(taskId, { progress: 100 });
      this.emitEvent({ type: "progress", taskId, progress: 100 });

      this.updateTask(taskId, {
        status: "completed",
        completedAt: new Date(),
        result,
      });

      this.emitEvent({ type: "completed", taskId, result });
      this.taskControllers.delete(taskId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Download failed";

      this.updateTask(taskId, {
        status: "failed",
        completedAt: new Date(),
        error: errorMessage,
      });

      this.emitEvent({ type: "failed", taskId, error: errorMessage });
      this.taskControllers.delete(taskId);
    }
  }

  /**
   * 添加删除任务
   */
  async addDeleteTask(attachmentId: AttachmentId): Promise<TaskId> {
    const taskId = this.generateId();

    const task: DeleteTask = {
      id: taskId,
      type: "delete",
      status: "pending",
      createdAt: new Date(),
      progress: 0,
      attachmentId,
    };

    this.tasks.set(taskId, task);
    this.emitEvent({ type: "created", task });

    // 异步执行删除
    this.executeDeleteTask(taskId);

    return taskId;
  }

  /**
   * 执行删除任务
   */
  private async executeDeleteTask(taskId: TaskId): Promise<void> {
    const task = this.tasks.get(taskId) as DeleteTask;
    if (!task) return;

    try {
      this.updateTask(taskId, {
        status: "running",
        startedAt: new Date(),
        progress: 0,
      });
      this.emitEvent({ type: "started", taskId });

      const objectKey = this.getObjectKey(task.attachmentId);

      // 创建可取消的控制器
      const controller = new AbortController();
      this.taskControllers.set(taskId, { abort: () => controller.abort() });

      // 执行删除
      await this.minioClient.removeObject(this.bucketName, objectKey);

      this.updateTask(taskId, { progress: 100 });
      this.emitEvent({ type: "progress", taskId, progress: 100 });

      const result = true;

      this.updateTask(taskId, {
        status: "completed",
        completedAt: new Date(),
        result,
      });

      this.emitEvent({ type: "completed", taskId, result });
      this.taskControllers.delete(taskId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Delete failed";

      this.updateTask(taskId, {
        status: "failed",
        completedAt: new Date(),
        error: errorMessage,
      });

      this.emitEvent({ type: "failed", taskId, error: errorMessage });
      this.taskControllers.delete(taskId);
    }
  }

  /**
   * 获取任务详情
   */
  async getTask(taskId: TaskId): Promise<Task | null> {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 获取任务列表
   */
  async getTasks(filter?: TaskFilterOptions): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());

    if (filter) {
      if (filter.type) {
        tasks = tasks.filter((task) => task.type === filter.type);
      }

      if (filter.status) {
        const statuses = Array.isArray(filter.status)
          ? filter.status
          : [filter.status];
        tasks = tasks.filter((task) => statuses.includes(task.status));
      }

      if (filter.dateRange) {
        tasks = tasks.filter((task) => {
          if (
            filter.dateRange!.start &&
            task.createdAt < filter.dateRange!.start
          ) {
            return false;
          }
          if (filter.dateRange!.end && task.createdAt > filter.dateRange!.end) {
            return false;
          }
          return true;
        });
      }
    }

    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: TaskId): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "running") {
      return false;
    }

    const controller = this.taskControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.taskControllers.delete(taskId);
    }

    this.updateTask(taskId, {
      status: "cancelled",
      completedAt: new Date(),
    });

    this.emitEvent({ type: "cancelled", taskId });
    return true;
  }

  /**
   * 重试失败的任务
   */
  async retryTask(taskId: TaskId): Promise<TaskId> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "failed") {
      throw new Error("Task not found or not in failed status");
    }

    switch (task.type) {
      case "upload":
        return this.addUploadTask((task as UploadTask).file);
      case "download":
        return this.addDownloadTask((task as DownloadTask).attachmentId);
      case "delete":
        return this.addDeleteTask((task as DeleteTask).attachmentId);
      default:
        throw new Error("Unknown task type");
    }
  }

  /**
   * 清理已完成的任务
   */
  async cleanupCompletedTasks(olderThan?: Date): Promise<number> {
    const cutoffTime = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000); // 默认24小时前
    let count = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      if (
        (task.status === "completed" ||
          task.status === "failed" ||
          task.status === "cancelled") &&
        task.completedAt &&
        task.completedAt < cutoffTime
      ) {
        this.tasks.delete(taskId);
        count++;
      }
    }

    return count;
  }

  /**
   * 获取附件元数据
   */
  async getMetadata(id: AttachmentId): Promise<AttachmentMetadata | null> {
    try {
      const objectKey = this.getObjectKey(id);
      const stat = await this.minioClient.statObject(
        this.bucketName,
        objectKey
      );

      return {
        id,
        filename: stat.metaData?.filename || id,
        mimeType: stat.metaData?.["content-type"] || "application/octet-stream",
        size: stat.size,
        uploadedAt: stat.lastModified,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查附件是否存在
   */
  async exists(id: AttachmentId): Promise<boolean> {
    try {
      const objectKey = this.getObjectKey(id);
      await this.minioClient.statObject(this.bucketName, objectKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 添加任务事件监听器
   */
  addEventListener(listener: TaskEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * 移除任务事件监听器
   */
  removeEventListener(listener: TaskEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }
}
