import { useRouter } from "expo-router";
import { Alert, View } from "react-native";

import { Button, Card, Screen, Skeleton, Text } from "@/components/ui";
import { formatTry } from "@/domain/money";
import { useSession, useSignOut } from "@/features/auth/hooks";
import { useCategories } from "@/features/categories/hooks";
import { newTransactionId } from "@/features/transactions/api";
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
} from "@/features/transactions/hooks";
import { getErrorMessage } from "@/lib/appwrite/errors";

/** GEÇİCİ: ADIM 4b veri katmanı testi. ADIM 4c'de kaldırılacak. */
function DevDataCard() {
  const categories = useCategories();
  const transactions = useTransactions();
  const createMutation = useCreateTransaction();
  const deleteMutation = useDeleteTransaction();

  const categoryList = categories.data ?? [];
  const categoryNames = new Map(
    categoryList.map((category) => [category.id, category.name]),
  );
  const firstExpenseCategory = categoryList.find(
    (category) => category.type === "expense",
  );
  const items = transactions.data?.pages.flatMap((page) => page.items) ?? [];
  const latest = items[0];

  const addRandomExpense = () => {
    if (!firstExpenseCategory) return;
    createMutation.mutate({
      id: newTransactionId(),
      input: {
        type: "expense",
        // 1,00 TL ile 500,00 TL arasında rastgele bir TAM SAYI kuruş değeri.
        amountMinor: 100 + Math.floor(Math.random() * 49_901),
        categoryId: firstExpenseCategory.id,
        note: "Geliştirici testi",
        date: new Date().toISOString(),
      },
    });
  };

  const error =
    categories.error ??
    transactions.error ??
    createMutation.error ??
    deleteMutation.error;

  return (
    <Card>
      <Text variant="subtitle">Geliştirici testi (ADIM 4b)</Text>

      {categories.isPending ? (
        <Skeleton className="h-4 w-1/2" />
      ) : (
        <Text tone="muted">
          Kategoriler: {categoryList.filter((c) => c.type === "expense").length}{" "}
          gider, {categoryList.filter((c) => c.type === "income").length} gelir
        </Text>
      )}

      {createMutation.isPaused || deleteMutation.isPaused ? (
        <Text tone="warning">Çevrimdışı: bağlantı gelince gönderilecek.</Text>
      ) : null}

      {error ? <Text tone="expense">{getErrorMessage(error)}</Text> : null}

      {transactions.isPending ? (
        <View className="gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </View>
      ) : items.length === 0 ? (
        <Text tone="muted">Henüz işlem yok.</Text>
      ) : (
        items.slice(0, 5).map((item) => (
          <View key={item.id} className="flex-row items-center justify-between">
            <Text className="flex-1" numberOfLines={1}>
              {categoryNames.get(item.categoryId) ?? "Bilinmeyen kategori"}
            </Text>
            <Text numeric tone={item.type === "income" ? "income" : "expense"}>
              {formatTry(
                item.type === "income" ? item.amountMinor : -item.amountMinor,
              )}
            </Text>
          </View>
        ))
      )}

      <Button
        title="Rastgele gider ekle"
        size="sm"
        onPress={addRandomExpense}
        disabled={!firstExpenseCategory}
        fullWidth
      />
      <Button
        title="Son işlemi sil"
        size="sm"
        variant="secondary"
        onPress={() => latest && deleteMutation.mutate({ id: latest.id })}
        disabled={!latest}
        fullWidth
      />
    </Card>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const session = useSession();
  const signOutMutation = useSignOut();
  const user = session.data;

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

  return (
    <Screen scroll>
      <View className="gap-1">
        <Text variant="display">
          Merhaba{user?.name ? `, ${user.name}` : ""}
        </Text>
        <Text tone="muted">Dashboard ADIM 5'te burada olacak.</Text>
      </View>

      <Card>
        <Text variant="subtitle">Hesap</Text>
        <Text tone="muted">E-posta: {user?.email}</Text>
        <Text variant="caption" tone="muted">
          Kullanıcı ID: {user?.$id}
        </Text>
      </Card>

      <DevDataCard />

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
        variant="secondary"
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
