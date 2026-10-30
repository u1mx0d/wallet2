import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, View } from "react-native";

import { Button, EmptyState, Screen, Skeleton } from "@/components/ui";
import { formatMinorForInput } from "@/domain/money";
import { newTradeId, TradeRequestError } from "@/features/portfolio/api";
import { TradeForm } from "@/features/portfolio/components/TradeForm";
import { usePortfolio, useTradeMutation } from "@/features/portfolio/hooks";
import { getErrorMessage } from "@/lib/appwrite/errors";

function tradeErrorMessage(error: unknown): string {
  return error instanceof TradeRequestError
    ? error.message
    : getErrorMessage(error);
}

export default function TradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    side?: string;
    symbol?: string;
    id?: string;
  }>();
  const editingId = typeof params.id === "string" ? params.id : undefined;

  const { trades, view } = usePortfolio();
  const mutation = useTradeMutation();
  const [newId] = useState(newTradeId);
  const [initialDate] = useState(() => new Date());

  useEffect(() => {
    if (mutation.isPaused) router.back();
  }, [mutation.isPaused, router]);

  const existing = editingId
    ? trades.data?.find((trade) => trade.id === editingId)
    : undefined;
  const title = editingId
    ? "İşlemi düzenle"
    : params.side === "sell"
      ? "Satış ekle"
      : "Alım ekle";
  const header = <Stack.Screen options={{ headerShown: true, title }} />;

  if (editingId && trades.isPending) {
    return (
      <Screen edges={["bottom"]}>
        {header}
        <Skeleton className="h-64 w-full rounded-2xl" />
      </Screen>
    );
  }

  if (editingId && !existing) {
    return (
      <Screen edges={["bottom"]} contentClassName="justify-center">
        {header}
        <EmptyState
          title="İşlem bulunamadı"
          description="Bu işlem silinmiş olabilir."
          actionLabel="Geri dön"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  /** Satış formu için eldeki lot. Düzenlenen satışın kendi lotları da kullanılabilir sayılır. */
  const availableLots = (symbol: string): number | null => {
    if (!view?.ok) return null;
    const held =
      view.positions.find((position) => position.symbol === symbol)?.lots ?? 0;
    const ownLots =
      existing && existing.side === "sell" && existing.symbol === symbol
        ? existing.lots
        : 0;
    return held + ownLots;
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert(
      "İşlemi sil",
      `${existing.symbol} ${existing.side === "buy" ? "alımı" : "satımı"} silinsin mi?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () =>
            mutation.mutate(
              { action: "delete", id: existing.id },
              { onSuccess: () => router.back() },
            ),
        },
      ],
    );
  };

  const initial = existing
    ? {
        side: existing.side,
        symbol: existing.symbol,
        lots: String(existing.lots),
        price: formatMinorForInput(existing.priceMinor),
        fee:
          existing.feeMinor > 0 ? formatMinorForInput(existing.feeMinor) : "",
        date: new Date(existing.date),
      }
    : {
        side: params.side === "sell" ? ("sell" as const) : ("buy" as const),
        symbol: typeof params.symbol === "string" ? params.symbol : "",
        lots: "",
        price: "",
        fee: "",
        date: initialDate,
      };

  return (
    <Screen scroll edges={["bottom"]}>
      {header}
      <TradeForm
        initial={initial}
        originalDate={existing ? new Date(existing.date) : undefined}
        availableLots={availableLots}
        symbolLocked={Boolean(existing)}
        submitLabel={existing ? "Değişiklikleri kaydet" : "Kaydet"}
        isSubmitting={mutation.isPending && !mutation.isPaused}
        submitError={
          mutation.isError ? tradeErrorMessage(mutation.error) : null
        }
        onChange={() => {
          if (mutation.isError) mutation.reset();
        }}
        onSubmit={(fields) =>
          mutation.mutate(
            existing
              ? { action: "update", id: existing.id, trade: fields }
              : { action: "create", id: newId, trade: fields },
            { onSuccess: () => router.back() },
          )
        }
        footer={
          existing ? (
            <View>
              <Button
                title="İşlemi sil"
                variant="ghost"
                onPress={confirmDelete}
                disabled={mutation.isPending}
                fullWidth
              />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
