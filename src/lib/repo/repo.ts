import { App } from "../app/app";
import type { AttachmentStorage } from "../app/attachment/storage";
import type { Persistence } from "../app/persistence";
import { z } from "zod";

const localStoragePersistenceParamsSchema = z.object({});

const r2AttachmentStorageParamsSchema = z.object({
  endpoint: z.string(),
  bucket: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  useSSL: z.boolean().optional(),
  region: z.string().optional(),
});

const repoConfigSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  persistence: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("local-storage"),
      params: localStoragePersistenceParamsSchema,
    }),
  ]),
  attachment: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("r2"),
      params: r2AttachmentStorageParamsSchema,
    }),
  ]),
});

export type RepoConfig = z.infer<typeof repoConfigSchema>;

export type ProviderRegistry = {
  persistence: Record<string, (config: RepoConfig) => Persistence>;
  attachmentStorage: Record<string, (config: RepoConfig) => AttachmentStorage>;
};

export class Repo {
  readonly config: RepoConfig;
  private providers: ProviderRegistry;
  private _app: App | null = null;

  constructor(config: RepoConfig, providers: ProviderRegistry) {
    this.config = config;
    this.providers = providers;
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
    const { providers, config } = this;

    const persistenceFac = providers.persistence[config.persistence.type];
    if (!persistenceFac) {
      throw new Error(`未注册 PersistenceProvider: ${config.persistence.type}`);
    }

    const attachmentFac = providers.attachmentStorage[config.attachment.type];
    if (!attachmentFac) {
      throw new Error(
        `未注册 AttachmentStorageProvider: ${config.attachment.type}`
      );
    }

    const persistence = persistenceFac(config);
    console.log("persistence instance created");

    const attachmentStorage = attachmentFac(config);
    console.log("attachment storage instance created");

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
