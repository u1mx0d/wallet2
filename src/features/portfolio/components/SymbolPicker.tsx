import { useState } from "react";
import { Pressable, View } from "react-native";

import { Button, Card, Input, Skeleton, Text } from "@/components/ui";
import { formatTry } from "@/domain/money";
import { getErrorMessage } from "@/lib/appwrite/errors";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

import { useSymbolSearch } from "../hooks";
import type { Quote } from "../schemas";

const MAX_RESULTS = 8;

export type SymbolPickerProps = {
  /** Seçili sembol ("" = seçilmedi). */
  symbol: string;
  /** Seçili sembolün fiyat bilgisi (yüklenmişse). */
  quote: Quote | undefined;
  onSelect: (quote: Quote | null) => void;
  error?: string;
  /** Düzenlemede sembol değiştirilemez. */
  locked?: boolean;
};

export function SymbolPicker({
  symbol,
  quote,
  onSelect,
  error,
  locked = false,
}: SymbolPickerProps) {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 300);
  const search = useSymbolSearch(debounced);

  if (symbol) {
    return (
      <View className="gap-1.5">
        <Text variant="label">Hisse</Text>
        <Card className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="font-semibold">{symbol}</Text>
            {quote ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {quote.name} · {formatTry(quote.priceMinor)}
              </Text>
            ) : null}
          </View>
          {locked ? null : (
            <Button
              title="Değiştir"
              variant="ghost"
              size="sm"
              onPress={() => onSelect(null)}
            />
          )}
        </Card>
      </View>
    );
  }

  const results = (search.data ?? []).slice(0, MAX_RESULTS);

  return (
    <View className="gap-2">
      <Input
        label="Hisse"
        placeholder="Sembol veya şirket adı (ör. THYAO)"
        value={query}
        onChangeText={setQuery}
        error={error}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
      />

      {debounced.trim().length === 0 ? null : search.isPending ? (
        <View className="gap-2">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </View>
      ) : search.isError ? (
        <Text tone="expense">{getErrorMessage(search.error)}</Text>
      ) : results.length === 0 ? (
        <Text tone="muted">Eşleşen hisse bulunamadı.</Text>
      ) : (
        <View
          accessibilityRole="list"
          className="overflow-hidden rounded-xl border border-border"
        >
          {results.map((result) => (
            <Pressable
              key={result.symbol}
              accessibilityRole="button"
              accessibilityLabel={`${result.symbol}, ${result.name}, ${formatTry(result.priceMinor)}`}
              onPress={() => {
                setQuery("");
                onSelect(result);
              }}
              className="min-h-[52px] flex-row items-center gap-3 border-b border-border bg-surface px-4 py-2"
            >
              <View className="flex-1">
                <Text className="font-semibold">{result.symbol}</Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {result.name}
                </Text>
              </View>
              <Text numeric tone="muted">
                {formatTry(result.priceMinor)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
