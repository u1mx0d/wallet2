import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

/** TanStack Query'nin bildiği bağlantı durumu (NetInfo'dan beslenir; bkz. query-client.ts). */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}
