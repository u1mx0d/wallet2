import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Alert, View } from "react-native";

import {
    Button,
    EmptyState,
    ErrorState,
    Screen,
    Skeleton,
} from "@/components/ui";
import { formatMinorForInput, formatTry } from "@/domain/money";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import {
    useDeleteTransaction,
    useTransaction,
    useUpdateTransaction,
} from "@/features/transactions/hooks";
import { getErrorMessage } from "@/lib/appwrite/errors";

export default function EditTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transaction = useTransaction(id);
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  useEffect(() => {
    if (updateMutation.isPaused) router.back();
  }, [updateMutation.isPaused, router]);

  const header = (
    <Stack.Screen options={{ headerShown: true, title: "İşlemi düzenle" }} />
  );

  if (transaction.isPending) {
    return (
      <Screen edges={["bottom"]}>
        {header}
        <View className="gap-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </View>
      </Screen>
    );
  }

  if (transaction.isError) {
    return (
      <Screen edges={["bottom"]} contentClassName="justify-center">
        {header}
        <ErrorState
          description={getErrorMessage(transaction.error)}
          onRetry={() => void transaction.refetch()}
          retrying={transaction.isFetching}
        />
      </Screen>
    );
  }

  const current = transaction.data;
  if (!current) {
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

  const confirmDelete = () => {
    Alert.alert(
      "İşlemi sil",
      `${formatTry(current.amountMinor)} tutarındaki ${current.type === "income" ? "gelir" : "gider"} silinsin mi?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            // Optimistic: listeden hemen kalkar; başarısız olursa geri gelir ve ana ekranda uyarı çıkar.
            deleteMutation.mutate({ id: current.id });
            router.back();
          },
        },
      ],
    );
  };

  return (
    <Screen scroll edges={["bottom"]}>
      {header}
      <TransactionForm
        initial={{
          type: current.type,
          amountText: formatMinorForInput(current.amountMinor),
          categoryId: current.categoryId,
          note: current.note ?? "",
          date: new Date(current.date),
        }}
        originalDate={new Date(current.date)}
        submitLabel="Değişiklikleri kaydet"
        isSubmitting={updateMutation.isPending && !updateMutation.isPaused}
        submitError={
          updateMutation.isError ? getErrorMessage(updateMutation.error) : null
        }
        onChange={() => {
          if (updateMutation.isError) updateMutation.reset();
        }}
        onSubmit={(input) =>
          updateMutation.mutate(
            { previous: current, input },
            { onSuccess: () => router.back() },
          )
        }
        footer={
          <Button
            title="İşlemi sil"
            variant="ghost"
            onPress={confirmDelete}
            disabled={updateMutation.isPending}
            fullWidth
          />
        }
      />
    </Screen>
  );
}
