import { App } from "../app/app";
import { getAttachmentStorage } from "../app/attachment";
import type { AttachmentStorage } from "../app/attachment/storage";
import { getPersistence } from "../persistence";
import type { Persistence } from "../persistence/persistence";
import { z } from "zod";

const r2AttachmentStorageParamsSchema = z.object({
  endpoint: z
    .string()
    .min(1, { message: "repoConfig.attachment.r2.endpointCannotBeEmpty" })
    .default(""),
  bucket: z
    .string()
    .min(1, { message: "repoConfig.attachment.r2.bucketCannotBeEmpty" })
    .default(""),
  accessKeyId: z
    .string()
    .min(1, { message: "repoConfig.attachment.r2.accessKeyIdCannotBeEmpty" })
    .default(""),
  secretAccessKey: z
    .string()
    .min(1, {
      message: "repoConfig.attachment.r2.secretAccessKeyCannotBeEmpty",
    })
    .default(""),
  useSSL: z.boolean().optional(),
  region: z.string().optional(),
});

const attachmentStorageSchema = z.discriminatedUnion(
  "type",
  [
    z.object({
      type: z.literal("r2"),
      params: r2AttachmentStorageParamsSchema,
    }),
    z.object({
      type: z.literal("none"),
      params: z.object({}).default({}),
    }),
  ],
  {
    errorMap: (issue) => ({
      message: "repoConfig.attachment.invalidAttachmentStorageType",
    }),
  }
);

const persistenceSchema = z.discriminatedUnion(
  "type",
  [
    z.object({
      type: z.literal("local-storage"),
      params: z.object({}).default({}),
    }),
  ],
  {
    errorMap: (issue) => ({
      message: "repoConfig.persistence.invalidPersistenceType",
    }),
  }
);

export const repoConfigSchema = z.object({
  id: z.string().min(1, { message: "repoConfig.idCannotBeEmpty" }).default(""),
  title: z
    .string()
    .min(1, { message: "repoConfig.titleCannotBeEmpty" })
    .default(""),
  persistence: persistenceSchema,
  attachment: attachmentStorageSchema,
});

export type RepoConfig = z.infer<typeof repoConfigSchema>;

export class Repo {
  readonly config: RepoConfig;
  private _app: App | null = null;

  constructor(config: RepoConfig) {
    this.config = config;
  }

  /** 获取当前活跃的 App 实例（可能为空，需先调用 instantiateApp） */
  get app(): App | null {
    return this._app;
  }

  /**
   * 创建并返回新的 App 实例。
   * 如果之前已存在实例，会先 destroy 再重建。
   */
  instantiateApp(): App {
    // persistence 是必须的
    const persistence = getPersistence(this.config);
    if (!persistence) {
      throw new Error(
        `Persistence not found! config: ${JSON.stringify(this.config)}`
      );
    }
    console.log("persistence:", persistence);

    // attachment storage 是可选的
    const attachmentStorage = getAttachmentStorage(this.config);
    console.log("attachment storage:", attachmentStorage);

    // 如果已有实例，先销毁
    if (this._app) {
      this._app.destroy();
      this._app = null;
    }

    this._app = new App({
      docId: this.config.id,
      persistence,
      attachmentStorage,
    });

    return this._app;
  }
}
