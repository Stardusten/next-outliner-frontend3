import type { TxOrigin } from "./types";

export function txOriginToString(origin: TxOrigin): string {
  return JSON.stringify(origin);
}

export function txOriginFromString(origin: string): TxOrigin {
  return JSON.parse(origin);
}
