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
import { formatLots } from "@/features/portfolio/format";
import { usePortfolio } from "@/features/portfolio/hooks";
import { getErrorMessage } from "@/lib/appwrite/errors";

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "income" | "expense";
}) {
  return (
    <View className="flex-row justify-between gap-3">
      <Text tone="muted">{label}</Text>
      <Text numeric tone={tone}>
        {value}
      </Text>
    </View>
  );
}

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

  return (
    <Screen scroll edges={["bottom"]}>
      {header}

      <View className="gap-1">
        <Text variant="title">{symbol}</Text>
        {quote ? (
          <Text tone="muted" numberOfLines={2}>
            {quote.name}
          </Text>
        ) : null}
      </View>

      {quote ? (
        <Card>
          <Text variant="label" tone="muted">
            Güncel fiyat
          </Text>
          <Text variant="display" numeric>
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
        <Row label="Eldeki lot" value={formatLots(position.lots)} />
        {position.lots > 0 ? (
          <Row
            label="Ortalama maliyet"
            value={formatTry(position.averageCostMinor)}
          />
        ) : null}
        {position.lots > 0 ? (
          <Row
            label="Toplam maliyet"
            value={formatTry(position.totalCostMinor)}
          />
        ) : null}
        {position.marketValueMinor !== null && position.lots > 0 ? (
          <Row
            label="Piyasa değeri"
            value={formatTry(position.marketValueMinor)}
          />
        ) : null}
        {position.unrealizedPnlMinor !== null && position.lots > 0 ? (
          <Row
            label="Gerçekleşmemiş kâr/zarar"
            value={`${formatTry(position.unrealizedPnlMinor, { sign: "always" })}${
              position.unrealizedPnlBasisPoints === null
                ? ""
                : ` (${formatSignedBasisPoints(position.unrealizedPnlBasisPoints)})`
            }`}
            tone={signTone(position.unrealizedPnlMinor)}
          />
        ) : null}
        {position.dailyChangeMinor !== null && position.lots > 0 ? (
          <Row
            label="Günlük değişim (yaklaşık)"
            value={formatTry(position.dailyChangeMinor, { sign: "always" })}
            tone={signTone(position.dailyChangeMinor)}
          />
        ) : null}
        <Row
          label="Gerçekleşmiş kâr/zarar"
          value={formatTry(position.realizedPnlMinor, { sign: "always" })}
          tone={signTone(position.realizedPnlMinor)}
        />
        <Row
          label="Ödenen komisyon"
          value={formatTry(position.feesPaidMinor)}
        />
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
          disabled={position.lots === 0}
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
