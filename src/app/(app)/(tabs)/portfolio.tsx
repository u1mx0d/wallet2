import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
  Text,
} from "@/components/ui";
import { formatTry } from "@/domain/money";
import { describeEngineError } from "@/domain/portfolio";
import { AllocationCard } from "@/features/portfolio/components/AllocationCard";
import { InvestmentDisclaimer } from "@/features/portfolio/components/InvestmentDisclaimer";
import { PortfolioSummaryCard } from "@/features/portfolio/components/PortfolioSummaryCard";
import { PositionCard } from "@/features/portfolio/components/PositionCard";
import { QuoteFreshness } from "@/features/portfolio/components/QuoteFreshness";
import { priceKeys, usePortfolio } from "@/features/portfolio/hooks";
import { useLivePrices } from "@/features/portfolio/useLivePrices";
import { getErrorMessage } from "@/lib/appwrite/errors";

export default function PortfolioScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [now] = useState(() => new Date());
  const { trades, quotes, view } = usePortfolio();
  const liveStatus = useLivePrices();

  // Sekmeye her dönüşte fiyatları yenile (Realtime çalışmasa bile güncel fiyat görünsün).
  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: priceKeys.quotesAll });
    }, [queryClient]),
  );

  const openTrade = (side: "buy" | "sell") =>
    router.push({ pathname: "/investments/trade", params: { side } });
  const openStock = (symbol: string) =>
    router.push({
      pathname: "/investments/stock/[symbol]",
      params: { symbol },
    });

  const actions = (
    <View className="flex-row gap-3">
      <Button
        title="Alım ekle"
        className="flex-1"
        onPress={() => openTrade("buy")}
      />
      <Button
        title="Satış ekle"
        variant="secondary"
        className="flex-1"
        onPress={() => openTrade("sell")}
      />
    </View>
  );

  let content;
  if (trades.isPending) {
    content = (
      <View className="gap-3">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </View>
    );
  } else if (trades.isError) {
    content = (
      <ErrorState
        description={getErrorMessage(trades.error)}
        onRetry={() => void trades.refetch()}
        retrying={trades.isFetching}
      />
    );
  } else if (!view || (view.ok && view.positions.length === 0)) {
    content = (
      <EmptyState
        title="Henüz yatırım işlemi yok"
        description="Aldığın hisseleri ekleyerek portföyünü takip et."
        actionLabel="İlk alımını ekle"
        onAction={() => openTrade("buy")}
      />
    );
  } else if (!view.ok) {
    content = (
      <ErrorState
        title="İşlem geçmişinde tutarsızlık var"
        description={describeEngineError(view.error)}
      />
    );
  } else {
    const open = view.positions.filter((position) => position.lots > 0);
    const closed = view.positions.filter((position) => position.lots === 0);

    content = (
      <>
        <PortfolioSummaryCard summary={view.summary} />
        <QuoteFreshness
          quotes={quotes.data ?? []}
          now={now}
          liveStatus={liveStatus}
        />
        {quotes.isError ? (
          <Text tone="expense">{getErrorMessage(quotes.error)}</Text>
        ) : null}
        <AllocationCard allocation={view.summary.allocation} />

        {open.length > 0 ? (
          <View className="gap-3">
            <Text variant="subtitle">Pozisyonlar</Text>
            {open.map((position) => (
              <PositionCard
                key={position.symbol}
                position={position}
                quote={view.quotesBySymbol.get(position.symbol)}
                onPress={() => openStock(position.symbol)}
              />
            ))}
          </View>
        ) : null}

        {closed.length > 0 ? (
          <Card>
            <Text variant="subtitle">Kapanmış pozisyonlar</Text>
            {closed.map((position) => (
              <Button
                key={position.symbol}
                title={`${position.symbol} · gerçekleşmiş ${formatTry(position.realizedPnlMinor, { sign: "always" })}`}
                variant="ghost"
                size="sm"
                onPress={() => openStock(position.symbol)}
                fullWidth
              />
            ))}
          </Card>
        ) : null}
      </>
    );
  }

  return (
    <Screen scroll edges={[]}>
      <SyncStatusBanner />
      {actions}
      {content}
      <InvestmentDisclaimer />
    </Screen>
  );
}
