import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

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
import type { Period } from "@/domain/periods";
import { useSession, useSignOut } from "@/features/auth/hooks";
import { useCategories } from "@/features/categories/hooks";
import { ExpenseDonutCard } from "@/features/dashboard/components/ExpenseDonutCard";
import { MonthlyBarsCard } from "@/features/dashboard/components/MonthlyBarsCard";
import { NetTrendCard } from "@/features/dashboard/components/NetTrendCard";
import { PeriodSelector } from "@/features/dashboard/components/PeriodSelector";
import { SummaryCards } from "@/features/dashboard/components/SummaryCards";
import { useDashboard } from "@/features/dashboard/useDashboard";
import { TransactionRow } from "@/features/transactions/components/TransactionRow";
import { useTransactions } from "@/features/transactions/hooks";
import { getErrorMessage } from "@/lib/appwrite/errors";
import { cn } from "@/lib/cn";

const RECENT_COUNT = 5;

function RecentTransactions({ now }: { now: Date }) {
  const router = useRouter();
  const transactions = useTransactions();
  const categories = useCategories();

  const categoryById = new Map(
    (categories.data ?? []).map((category) => [category.id, category]),
  );
  const items = (
    transactions.data?.pages.flatMap((page) => page.items) ?? []
  ).slice(0, RECENT_COUNT);

  return (
    <Card>
      <Text variant="subtitle">Son işlemler</Text>

      {transactions.isPending ? (
        <View className="gap-3">
          {[0, 1, 2].map((key) => (
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
          className="py-4"
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Henüz işlem yok"
          description="İlk gelir veya giderini ekleyerek başla."
          className="py-4"
        />
      ) : (
        <View>
          {items.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              category={categoryById.get(transaction.categoryId)}
              now={now}
              onPress={() =>
                router.push({
                  pathname: "/transactions/[id]",
                  params: { id: transaction.id },
                })
              }
            />
          ))}
        </View>
      )}
    </Card>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const session = useSession();
  const signOutMutation = useSignOut();
  const user = session.data;

  const [now] = useState(() => new Date());
  const [period, setPeriod] = useState<Period>({ kind: "month" });
  const dashboard = useDashboard(period, now);

  const confirmSignOut = () => {
    Alert.alert("Çıkış yap", "Hesabından çıkmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkış yap",
        style: "destructive",
        onPress: () => signOutMutation.mutate(),
      },
    ]);
  };

  const dashboardError =
    dashboard.periodQuery.error ?? dashboard.monthsQuery.error;

  return (
    <Screen scroll>
      <View className="gap-1">
        <Text variant="display">
          Merhaba{user?.name ? `, ${user.name}` : ""}
        </Text>
      </View>

      <SyncStatusBanner />

      <View className="flex-row gap-3">
        <Button
          title="Gider ekle"
          variant="danger"
          className="flex-1"
          onPress={() =>
            router.push({
              pathname: "/transactions/new",
              params: { type: "expense" },
            })
          }
        />
        <Button
          title="Gelir ekle"
          className="flex-1"
          onPress={() =>
            router.push({
              pathname: "/transactions/new",
              params: { type: "income" },
            })
          }
        />
      </View>

      <PeriodSelector period={period} onChange={setPeriod} now={now} />

      {dashboard.truncated ? (
        <View
          accessibilityRole="alert"
          className="rounded-xl bg-warning/15 p-3"
        >
          <Text tone="warning">
            Bu dönemde çok fazla işlem var; özet ve grafikler eksik olabilir.
            Daha kısa bir dönem seç.
          </Text>
        </View>
      ) : null}

      {dashboardError && !dashboard.summary ? (
        <ErrorState
          description={getErrorMessage(dashboardError)}
          onRetry={() => {
            void dashboard.periodQuery.refetch();
            void dashboard.monthsQuery.refetch();
          }}
          retrying={
            dashboard.periodQuery.isFetching || dashboard.monthsQuery.isFetching
          }
        />
      ) : (
        <View className={cn("gap-4", dashboard.isRefreshing && "opacity-60")}>
          <SummaryCards summary={dashboard.summary} />
          <ExpenseDonutCard
            slices={dashboard.breakdown}
            totalExpenseMinor={dashboard.summary?.expenseMinor ?? 0}
          />
          <MonthlyBarsCard monthly={dashboard.monthly} />
          <NetTrendCard trend={dashboard.trend} />
        </View>
      )}

      <RecentTransactions now={now} />

      <Button
        title="Kategorileri yönet"
        variant="secondary"
        onPress={() => router.push("/categories")}
        fullWidth
      />

      {signOutMutation.isError ? (
        <View
          accessibilityRole="alert"
          className="rounded-xl bg-expense/10 p-3"
        >
          <Text tone="expense">{getErrorMessage(signOutMutation.error)}</Text>
        </View>
      ) : null}

      <Button
        title="Çıkış yap"
        variant="ghost"
        onPress={confirmSignOut}
        loading={signOutMutation.isPending}
        fullWidth
      />

      <Button
        title="Hesabı sil"
        variant="ghost"
        onPress={() => router.push("/delete-account")}
        disabled={signOutMutation.isPending}
        fullWidth
      />
    </Screen>
  );
}
