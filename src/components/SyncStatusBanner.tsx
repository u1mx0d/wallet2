import {
    useMutationState,
    useQueryClient,
    type Mutation,
} from "@tanstack/react-query";
import { View } from "react-native";

import { Button, Text } from "@/components/ui";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

/** Kullanıcı verisini değiştiren mutation'lar (anahtarları hooks dosyalarında tanımlı). */
function isSyncMutation(
  mutation: Mutation<unknown, Error, unknown, unknown>,
): boolean {
  const scope = mutation.options.mutationKey?.[0];
  return scope === "transactions" || scope === "categories";
}

/**
 * Çevrimdışı durumunu, bağlantı bekleyen değişiklikleri ve kaydedilemeyen değişiklikleri gösterir.
 * Hiçbiri yoksa hiçbir şey çizmez.
 */
export function SyncStatusBanner() {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const pausedCount = useMutationState({
    filters: { status: "pending", predicate: isSyncMutation },
    select: (mutation) => mutation.state.isPaused,
  }).filter(Boolean).length;

  const failedCount = useMutationState({
    filters: { status: "error", predicate: isSyncMutation },
    select: (mutation) => mutation.mutationId,
  }).length;

  const dismissFailed = () => {
    const cache = queryClient.getMutationCache();
    for (const mutation of cache.findAll({
      status: "error",
      predicate: isSyncMutation,
    })) {
      cache.remove(mutation);
    }
  };

  if (isOnline && pausedCount === 0 && failedCount === 0) return null;

  return (
    <View className="gap-2">
      {!isOnline || pausedCount > 0 ? (
        <View
          accessibilityRole="alert"
          className="rounded-xl bg-warning/15 p-3"
        >
          <Text tone="warning">
            {isOnline
              ? "Bağlantı kuruldu, değişiklikler gönderiliyor."
              : "Çevrimdışısın."}
            {pausedCount > 0
              ? ` ${pausedCount} değişiklik bağlantı gelince kaydedilecek.`
              : ""}
          </Text>
          {pausedCount > 0 ? (
            <Text variant="caption" tone="muted">
              Uygulamayı tamamen kapatırsan bekleyen değişiklikler kaybolabilir.
            </Text>
          ) : null}
        </View>
      ) : null}

      {failedCount > 0 ? (
        <View
          accessibilityRole="alert"
          className="gap-2 rounded-xl bg-expense/10 p-3"
        >
          <Text tone="expense">
            {failedCount} değişiklik kaydedilemedi ve geri alındı. Lütfen tekrar
            dene.
          </Text>
          <Button
            title="Tamam"
            variant="secondary"
            size="sm"
            onPress={dismissFailed}
          />
        </View>
      ) : null}
    </View>
  );
}
