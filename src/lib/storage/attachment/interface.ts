/**
 * 附件ID，唯一标识一个附件
 */
export type AttachmentId = string;

/**
 * 任务ID，唯一标识一个任务
 */
export type TaskId = string;

/**
 * 附件元数据
 */
export type AttachmentMetadata = {
  /** 附件ID */
  id: AttachmentId;
  /** 文件名 */
  filename: string;
  /** MIME类型 */
  mimeType: string;
  /** 文件大小（字节） */
  size: number;
  /** 上传时间 */
  uploadedAt: Date;
  /** 额外信息 */
  [key: string]: unknown;
};

/**
 * 任务状态
 */
export type TaskStatus =
  | "pending" // 等待中
  | "running" // 进行中
  | "completed" // 已完成
  | "failed" // 失败
  | "cancelled"; // 已取消

/**
 * 任务类型
 */
export type TaskType = "upload" | "download" | "delete";

/**
 * 基础任务信息
 */
export type BaseTask = {
  /** 任务ID */
  id: TaskId;
  /** 任务类型 */
  type: TaskType;
  /** 任务状态 */
  status: TaskStatus;
  /** 创建时间 */
  createdAt: Date;
  /** 开始时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 错误信息 */
  error?: string;
  /** 进度 (0-100) */
  progress: number;
};

/**
 * 上传任务
 */
export type UploadTask = BaseTask & {
  type: "upload";
  /** 要上传的文件 */
  file: File;
  /** 上传完成后的附件元数据 */
  result?: AttachmentMetadata;
};

/**
 * 下载任务
 */
export type DownloadTask = BaseTask & {
  type: "download";
  /** 要下载的附件ID */
  attachmentId: AttachmentId;
  /** 下载完成后的文件 */
  result?: Blob;
};

/**
 * 删除任务
 */
export type DeleteTask = BaseTask & {
  type: "delete";
  /** 要删除的附件ID */
  attachmentId: AttachmentId;
  /** 删除是否成功 */
  result?: boolean;
};

/**
 * 任务联合类型
 */
export type Task = UploadTask | DownloadTask | DeleteTask;

/**
 * 任务过滤选项
 */
export type TaskFilterOptions = {
  /** 任务类型过滤 */
  type?: TaskType;
  /** 任务状态过滤 */
  status?: TaskStatus | TaskStatus[];
  /** 时间范围过滤 */
  dateRange?: {
    start?: Date;
    end?: Date;
  };
};

/**
 * 任务事件
 */
export type TaskEvent =
  | { type: "created"; task: Task }
  | { type: "started"; taskId: TaskId }
  | { type: "progress"; taskId: TaskId; progress: number }
  | { type: "completed"; taskId: TaskId; result: any }
  | { type: "failed"; taskId: TaskId; error: string }
  | { type: "cancelled"; taskId: TaskId };

export type TaskEventListener = (event: TaskEvent) => void;

/**
 * 附件存储接口
 *
 * 基于异步任务系统的附件存储功能
 */
export interface AttachmentStorage {
  /**
   * 添加上传任务
   * @param file 要上传的文件
   * @returns 上传任务ID
   */
  addUploadTask(file: File): Promise<TaskId>;

  /**
   * 添加下载任务
   * @param attachmentId 附件ID
   * @returns 下载任务ID
   */
  addDownloadTask(attachmentId: AttachmentId): Promise<TaskId>;

  /**
   * 添加删除任务
   * @param attachmentId 附件ID
   * @returns 删除任务ID
   */
  addDeleteTask(attachmentId: AttachmentId): Promise<TaskId>;

  /**
   * 获取任务详情
   * @param taskId 任务ID
   * @returns 任务信息
   */
  getTask(taskId: TaskId): Promise<Task | null>;

  /**
   * 获取任务列表
   * @param filter 过滤条件
   * @returns 任务列表
   */
  getTasks(filter?: TaskFilterOptions): Promise<Task[]>;

  /**
   * 取消任务
   * @param taskId 任务ID
   * @returns 是否取消成功
   */
  cancelTask(taskId: TaskId): Promise<boolean>;

  /**
   * 重试失败的任务
   * @param taskId 任务ID
   * @returns 新的任务ID
   */
  retryTask(taskId: TaskId): Promise<TaskId>;

  /**
   * 清理已完成的任务
   * @param olderThan 清理指定时间之前的任务
   * @returns 清理的任务数量
   */
  cleanupCompletedTasks(olderThan?: Date): Promise<number>;

  /**
   * 获取附件元数据
   * @param id 附件ID
   * @returns 附件元数据，如果不存在则返回 null
   */
  getMetadata(id: AttachmentId): Promise<AttachmentMetadata | null>;

  /**
   * 检查附件是否存在
   * @param id 附件ID
   * @returns 是否存在
   */
  exists(id: AttachmentId): Promise<boolean>;

  /**
   * 添加任务事件监听器
   * @param listener 事件监听器
   */
  addEventListener(listener: TaskEventListener): void;

  /**
   * 移除任务事件监听器
   * @param listener 事件监听器
   */
  removeEventListener(listener: TaskEventListener): void;
}
