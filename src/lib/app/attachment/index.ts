import type { RepoConfig } from "@/lib/repo/repo";
import type { AttachmentStorage } from "./storage";
import { R2AttachmentStorage } from "./r2-browser";

export function getAttachmentStorage(
  config: RepoConfig
): AttachmentStorage | null {
  if (config.attachment.type === "r2") {
    return new R2AttachmentStorage(config.attachment.params);
  }

  return null;
}
