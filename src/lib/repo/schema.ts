import z from "zod";

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
