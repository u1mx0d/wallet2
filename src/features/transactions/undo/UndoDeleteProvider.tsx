import { useQueryClient } from "@tanstack/react-query";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { AccessibilityInfo, AppState, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Text } from "@/components/ui";
import { formatTry } from "@/domain/money";
import { useCurrentUserId } from "@/features/auth/useCurrentUserId";

import {
    removeFromTransactionLists,
    restoreToTransactionLists,
    useDeleteTransaction,
} from "../hooks";
import type { Transaction } from "../schemas";

/** Silme bu süre sonunda sunucuya gönderilir; öncesinde "Geri al" ile iptal edilebilir. */
export const UNDO_WINDOW_MS = 5_000;

type UndoDeleteContextValue = {
  /** İşlemi listeden hemen kaldırır; sunucu silmesini UNDO_WINDOW_MS sonra yapar. */
  scheduleDelete: (transaction: Transaction) => void;
  /** Bekleyen silmeyi hemen sunucuya gönderir (ör. çıkış yapmadan önce). */
  flushPendingDelete: () => void;
};

const UndoDeleteContext = createContext<UndoDeleteContextValue | null>(null);

type Pending = {
  transaction: Transaction;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Uygulama genelinde tek bir geri alınabilir silme. Ekran değişse de çubuk görünmeye devam eder.
 * Bekleyen silme şu durumlarda HEMEN gönderilir: yeni bir silme yapılınca, uygulama arka plana
 * alınınca, bu bileşen kaldırılınca (oturum kapanınca) ve flushPendingDelete çağrılınca.
 */
export function UndoDeleteProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const { mutate: deleteTransaction } = useDeleteTransaction();
  const insets = useSafeAreaInsets();

  const pendingRef = useRef<Pending | null>(null);
  const [visible, setVisible] = useState<Transaction | null>(null);

  const flushPendingDelete = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    clearTimeout(pending.timer);
    setVisible(null);
    deleteTransaction({ id: pending.transaction.id });
  }, [deleteTransaction]);

  const scheduleDelete = useCallback(
    (transaction: Transaction) => {
      flushPendingDelete();
      void removeFromTransactionLists(queryClient, userId, transaction.id);
      const timer = setTimeout(() => {
        if (pendingRef.current?.transaction.id === transaction.id)
          flushPendingDelete();
      }, UNDO_WINDOW_MS);
      pendingRef.current = { transaction, timer };
      setVisible(transaction);
      AccessibilityInfo.announceForAccessibility(
        "İşlem silindi. Geri almak için Geri al düğmesini kullan.",
      );
    },
    [flushPendingDelete, queryClient, userId],
  );

  const undo = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    clearTimeout(pending.timer);
    setVisible(null);
    void restoreToTransactionLists(queryClient, userId, pending.transaction);
    AccessibilityInfo.announceForAccessibility("Silme geri alındı.");
  }, [queryClient, userId]);

  // Arka plana alınınca bekleyen silmeyi gönder: uygulama sonradan kapatılırsa silme kaybolmasın.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status !== "active") flushPendingDelete();
    });
    return () => subscription.remove();
  }, [flushPendingDelete]);

  // Bileşen kaldırılırken (oturum kapanırken) bekleyen silmeyi gönder.
  const flushRef = useRef(flushPendingDelete);
  flushRef.current = flushPendingDelete;
  useEffect(() => () => flushRef.current(), []);

  const value = useMemo(
    () => ({ scheduleDelete, flushPendingDelete }),
    [scheduleDelete, flushPendingDelete],
  );

  return (
    <UndoDeleteContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {visible ? (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: insets.bottom + 16,
            }}
          >
            <View
              accessibilityLiveRegion="polite"
              className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface py-1 pl-4 pr-1"
              style={{
                elevation: 6,
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <Text className="flex-1" numberOfLines={1}>
                İşlem silindi · {formatTry(visible.amountMinor)}
              </Text>
              <Button
                title="Geri al"
                variant="ghost"
                size="sm"
                onPress={undo}
              />
            </View>
          </View>
        ) : null}
      </View>
    </UndoDeleteContext.Provider>
  );
}

export function useUndoDelete(): UndoDeleteContextValue {
  const context = useContext(UndoDeleteContext);
  if (!context)
    throw new Error("useUndoDelete, UndoDeleteProvider içinde kullanılmalı.");
  return context;
}
