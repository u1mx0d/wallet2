import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

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
import {
  describeEngineError,
  formatSignedBasisPoints,
} from "@/domain/portfolio";
import { InvestmentDisclaimer } from "@/features/portfolio/components/InvestmentDisclaimer";
import { QuoteFreshness } from "@/features/portfolio/components/QuoteFreshness";
import { TradeRow } from "@/features/portfolio/components/TradeRow";
import { ValueRow } from "@/features/portfolio/components/ValueRow";
import { formatLots } from "@/features/portfolio/format";
import { usePortfolio } from "@/features/portfolio/hooks";
import { getErrorMessage } from "@/lib/appwrite/errors";

const signTone = (value: number) =>
  value >= 0 ? ("income" as const) : ("expense" as const);

export default function StockDetailScreen() {
  const router = useRouter();
  const [now] = useState(() => new Date());
  const params = useLocalSearchParams<{ symbol: string }>();
  const symbol = typeof params.symbol === "string" ? params.symbol : "";
  const { trades, view } = usePortfolio();

  const header = (
    <Stack.Screen options={{ headerShown: true, title: symbol }} />
  );

  if (trades.isPending) {
    return (
      <Screen edges={["bottom"]}>
        {header}
        <Skeleton className="h-48 w-full rounded-2xl" />
      </Screen>
    );
  }

  if (trades.isError) {
    return (
      <Screen edges={["bottom"]} contentClassName="justify-center">
        {header}
        <ErrorState
          description={getErrorMessage(trades.error)}
          onRetry={() => void trades.refetch()}
        />
      </Screen>
    );
  }

  if (view && !view.ok) {
    return (
      <Screen edges={["bottom"]} contentClassName="justify-center">
        {header}
        <ErrorState
          title="İşlem geçmişinde tutarsızlık var"
          description={describeEngineError(view.error)}
        />
      </Screen>
    );
  }

  const position = view?.ok
    ? view.positions.find((item) => item.symbol === symbol)
    : undefined;
  const quote = view?.ok ? view.quotesBySymbol.get(symbol) : undefined;
  const symbolTrades = (trades.data ?? [])
    .filter((trade) => trade.symbol === symbol)
    .sort(
      (a, b) =>
        Date.parse(b.date) - Date.parse(a.date) ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );

  if (!position) {
    return (
      <Screen edges={["bottom"]} contentClassName="justify-center">
        {header}
        <EmptyState
          title="Bu hissede işlem yok"
          actionLabel="Geri dön"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const openTrade = (side: "buy" | "sell") =>
    router.push({ pathname: "/investments/trade", params: { side, symbol } });

  const isOpen = position.lots > 0;

  return (
    <Screen scroll edges={["bottom"]}>
      {header}

      <View className="gap-1">
        <Text variant="title">{symbol}</Text>
        {quote ? <Text tone="muted">{quote.name}</Text> : null}
      </View>

      {quote ? (
        <Card>
          <Text variant="label" tone="muted">
            Güncel fiyat
          </Text>
          <Text
            variant="display"
            numeric
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatTry(quote.priceMinor)}
          </Text>
          {position.dailyChangeBasisPoints !== null ? (
            <Text numeric tone={signTone(position.dailyChangeBasisPoints)}>
              Günlük {formatSignedBasisPoints(position.dailyChangeBasisPoints)}
            </Text>
          ) : null}
          <QuoteFreshness quotes={[quote]} now={now} />
        </Card>
      ) : (
        <Text tone="warning">Bu hisse için fiyat bulunamadı.</Text>
      )}

      <Card>
        <Text variant="subtitle">Pozisyon</Text>
        <View className="gap-3">
          <ValueRow label="Eldeki lot" value={formatLots(position.lots)} />
          {isOpen ? (
            <ValueRow
              label="Ortalama maliyet"
              value={formatTry(position.averageCostMinor)}
            />
          ) : null}
          {isOpen ? (
            <ValueRow
              label="Toplam maliyet"
              value={formatTry(position.totalCostMinor)}
            />
          ) : null}
          {isOpen && position.marketValueMinor !== null ? (
            <ValueRow
              label="Piyasa değeri"
              value={formatTry(position.marketValueMinor)}
            />
          ) : null}
          {isOpen && position.unrealizedPnlMinor !== null ? (
            <ValueRow
              label="Gerçekleşmemiş kâr/zarar"
              value={formatTry(position.unrealizedPnlMinor, { sign: "always" })}
              detail={
                position.unrealizedPnlBasisPoints === null
                  ? undefined
                  : formatSignedBasisPoints(position.unrealizedPnlBasisPoints)
              }
              tone={signTone(position.unrealizedPnlMinor)}
              emphasize
            />
          ) : null}
          {isOpen && position.dailyChangeMinor !== null ? (
            <ValueRow
              label="Günlük değişim (yaklaşık)"
              value={formatTry(position.dailyChangeMinor, { sign: "always" })}
              tone={signTone(position.dailyChangeMinor)}
            />
          ) : null}
          <ValueRow
            label="Gerçekleşmiş kâr/zarar"
            value={formatTry(position.realizedPnlMinor, { sign: "always" })}
            tone={signTone(position.realizedPnlMinor)}
          />
          <ValueRow
            label="Ödenen komisyon"
            value={formatTry(position.feesPaidMinor)}
          />
        </View>
      </Card>

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
          disabled={!isOpen}
        />
      </View>

      <Card>
        <Text variant="subtitle">İşlem geçmişi</Text>
        {symbolTrades.map((trade) => (
          <TradeRow
            key={trade.id}
            trade={trade}
            now={now}
            onPress={() =>
              router.push({
                pathname: "/investments/trade",
                params: { id: trade.id },
              })
            }
          />
        ))}
      </Card>

      <InvestmentDisclaimer />
    </Screen>
  );
}
