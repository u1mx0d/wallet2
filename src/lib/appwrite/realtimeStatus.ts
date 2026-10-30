import { useSyncExternalStore } from "react";

import { realtime } from "./client";

/**
 * Realtime bağlantı durumu. SDK'nın onOpen/onClose callback'leri kaldırılamadığı için
 * modül yüklendiğinde BİR KEZ kaydedilir ve küçük bir dış store'a yazılır.
 */
export type RealtimeStatus = "connecting" | "connected" | "reconnecting";

let status: RealtimeStatus = "connecting";
let hasConnectedOnce = false;
const statusListeners = new Set<() => void>();
const reconnectListeners = new Set<() => void>();

function setStatus(next: RealtimeStatus): void {
  if (status === next) return;
  status = next;
  for (const listener of statusListeners) listener();
}

realtime.onOpen(() => {
  const isReconnect = hasConnectedOnce;
  hasConnectedOnce = true;
  setStatus("connected");
  // Kopukken gelen olaylar kaçırılmış olabilir: dinleyenler veriyi yeniden çeksin.
  if (isReconnect) for (const listener of reconnectListeners) listener();
});

realtime.onClose(() => setStatus("reconnecting"));

function subscribeStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

/** Bağlantı yeniden kurulduğunda çağrılır. Dönen fonksiyon dinlemeyi bırakır. */
export function onRealtimeReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener);
  return () => reconnectListeners.delete(listener);
}

export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(subscribeStatus, () => status);
}
