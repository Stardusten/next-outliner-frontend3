import type { Persistence } from "./persistence";
import type { RepoConfig } from "../repo/repo";
import {
  LocalStoragePersistence,
  checkExistsLocalStorage,
} from "./local-storage";

export function getPersistence(config: RepoConfig): Persistence | null {
  if (config.persistence.type === "local-storage") {
    return new LocalStoragePersistence(config.id);
  }

  return null;
}

export function checkExists(
  type: RepoConfig["persistence"]["type"],
  docId: string
): "valid" | "notFound" | "corrupted" | "unsupported" {
  if (type === "local-storage") {
    return checkExistsLocalStorage(docId);
  }

  return "unsupported";
}
