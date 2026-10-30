import { FlashList } from "@shopify/flash-list";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, View } from "react-native";

import {
    Button,
    Card,
    DateField,
    EmptyState,
    ErrorState,
    Input,
    Screen,
    SegmentedControl,
    Skeleton,
    Text,
} from "@/components/ui";
import { formatTry } from "@/domain/money";
import { CategoryPicker } from "@/features/categories/components/CategoryPicker";
import { useCategories } from "@/features/categories/hooks";
import type { TransactionType } from "@/features/categories/schemas";
import { TransactionRow } from "@/features/transactions/components/TransactionRow";
import {
    buildTransactionFilters,
    countActiveFilters,
    groupTransactionsByDay,
    type HistoryFilterState,
    type HistoryRow,
} from "@/features/transactions/history";
import { useTransactions } from "@/features/transactions/hooks";
import type { Transaction } from "@/features/transactions/schemas";
import { useUndoDelete } from "@/features/transactions/undo/UndoDeleteProvider";
import { getErrorMessage } from "@/lib/appwrite/errors";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

const SEARCH_DEBOUNCE_MS = 300;

export default function HistoryScreen() {
  const router = useRouter();
  const [now] = useState(() => new Date());
  const categories = useCategories();
  const { scheduleDelete } = useUndoDelete();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [type, setType] = useState<TransactionType | "all">("all");
  const [categoryId, setCategoryId] = useState("");
  const [dateRange, setDateRange] =
    useState<HistoryFilterState["dateRange"]>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterState: HistoryFilterState = {
    type,
    categoryId,
    dateRange,
    search: debouncedSearch,
  };
  const activeFilterCount = countActiveFilters(filterState);

  const filters = useMemo(
    () =>
      buildTransactionFilters(
        { type, categoryId, dateRange, search: debouncedSearch },
        categories.data ?? [],
        now,
      ),
    [type, categoryId, dateRange, debouncedSearch, categories.data, now],
  );

  const transactions = useTransactions(filters);
  const items = useMemo(
    () => transactions.data?.pages.flatMap((page) => page.items) ?? [],
    [transactions.data],
  );
  const { rows, headerIndices } = useMemo(
    () => groupTransactionsByDay(items, now),
    [items, now],
  );
  const categoryById = useMemo(
    () =>
      new Map(
        (categories.data ?? []).map((category) => [category.id, category]),
      ),
    [categories.data],
  );

  const changeType = (next: TransactionType | "all") => {
    setType(next);
    const selected = categoryById.get(categoryId);
    if (next !== "all" && selected && selected.type !== next) setCategoryId("");
  };

  const clearFilters = () => {
    setType("all");
    setCategoryId("");
    setDateRange(null);
  };

  const openEditor = (transaction: Transaction) =>
    router.push({
      pathname: "/transactions/[id]",
      params: { id: transaction.id },
    });

  const showActions = (transaction: Transaction) => {
    Alert.alert(
      categoryById.get(transaction.categoryId)?.name ?? "İşlem",
      formatTry(transaction.amountMinor),
      [
        { text: "Düzenle", onPress: () => openEditor(transaction) },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => scheduleDelete(transaction),
        },
        { text: "Vazgeç", style: "cancel" },
      ],
    );
  };

  const isSearching = debouncedSearch.trim().length > 0;
  const hasFilters = activeFilterCount > 0 || isSearching;

  const renderItem = ({ item }: { item: HistoryRow }) => {
    if (item.kind === "header") {
      return (
        <View className="bg-background py-2" accessibilityRole="header">
          <Text variant="label" tone="muted">
            {item.label}
          </Text>
        </View>
      );
    }
    return (
      <TransactionRow
        transaction={item.transaction}
        category={categoryById.get(item.transaction.categoryId)}
        now={now}
        hideDate
        onPress={() => openEditor(item.transaction)}
        onLongPress={() => showActions(item.transaction)}
        onDelete={() => scheduleDelete(item.transaction)}
      />
    );
  };

  const listEmpty = transactions.isPending ? (
    <View className="gap-3 pt-2">
      {[0, 1, 2, 3, 4].map((key) => (
        <View key={key} className="flex-row items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </View>
        </View>
      ))}
    </View>
  ) : transactions.isError ? (
    <ErrorState
      description={getErrorMessage(transactions.error)}
      onRetry={() => void transactions.refetch()}
      retrying={transactions.isFetching}
    />
  ) : hasFilters ? (
    <EmptyState
      title="Sonuç bulunamadı"
      description="Arama veya filtrelere uyan işlem yok."
      actionLabel={activeFilterCount > 0 ? "Filtreleri temizle" : undefined}
      onAction={activeFilterCount > 0 ? clearFilters : undefined}
    />
  ) : (
    <EmptyState
      title="Henüz işlem yok"
      description="İlk gelir veya giderini ekleyerek başla."
      actionLabel="Gider ekle"
      onAction={() =>
        router.push({
          pathname: "/transactions/new",
          params: { type: "expense" },
        })
      }
    />
  );

  return (
    <Screen edges={["bottom"]} contentClassName="pb-0">
      <Stack.Screen options={{ headerShown: true, title: "Tüm işlemler" }} />

      <Input
        label="Ara"
        placeholder="Not veya kategori adı"
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <View className="flex-row items-center gap-2">
        <Button
          title={
            activeFilterCount > 0
              ? `Filtreler (${activeFilterCount})`
              : "Filtreler"
          }
          variant="secondary"
          size="sm"
          onPress={() => setFiltersOpen((open) => !open)}
          accessibilityState={{ expanded: filtersOpen }}
        />
        {activeFilterCount > 0 ? (
          <Button
            title="Temizle"
            variant="ghost"
            size="sm"
            onPress={clearFilters}
          />
        ) : null}
      </View>

      {filtersOpen ? (
        <Card>
          <SegmentedControl
            accessibilityLabel="İşlem türü"
            value={type}
            onChange={changeType}
            options={[
              { value: "all", label: "Tümü" },
              { value: "expense", label: "Gider", selectedTone: "expense" },
              { value: "income", label: "Gelir", selectedTone: "income" },
            ]}
          />

          <CategoryPicker
            categories={(categories.data ?? []).filter(
              (category) => type === "all" || category.type === type,
            )}
            selectedId={categoryId}
            onSelect={(id) =>
              setCategoryId((current) => (current === id ? "" : id))
            }
            isLoading={categories.isPending}
          />

          {dateRange ? (
            <View className="gap-2">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <DateField
                    label="Başlangıç"
                    value={dateRange.start}
                    maximumDate={dateRange.end}
                    onChange={(day) =>
                      setDateRange({ ...dateRange, start: day })
                    }
                  />
                </View>
                <View className="flex-1">
                  <DateField
                    label="Bitiş"
                    value={dateRange.end}
                    maximumDate={now}
                    onChange={(day) => setDateRange({ ...dateRange, end: day })}
                  />
                </View>
              </View>
              <Button
                title="Tarih filtresini kaldır"
                variant="ghost"
                size="sm"
                onPress={() => setDateRange(null)}
              />
            </View>
          ) : (
            <Button
              title="Tarih aralığı seç"
              variant="ghost"
              size="sm"
              onPress={() =>
                setDateRange({
                  start: new Date(now.getFullYear(), now.getMonth(), 1),
                  end: now,
                })
              }
            />
          )}
        </Card>
      ) : null}

      <View className="flex-1">
        <FlashList
          data={rows}
          renderItem={renderItem}
          keyExtractor={(row) => row.key}
          getItemType={(row) => row.kind}
          stickyHeaderIndices={headerIndices}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => {
            if (transactions.hasNextPage && !transactions.isFetchingNextPage)
              void transactions.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          refreshing={
            transactions.isRefetching && !transactions.isFetchingNextPage
          }
          onRefresh={() => void transactions.refetch()}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={
            transactions.isFetchingNextPage ? (
              <View className="py-4">
                <Skeleton className="h-10 w-full rounded-xl" />
              </View>
            ) : (
              <View className="h-24" />
            )
          }
        />
      </View>
    </Screen>
  );
}
