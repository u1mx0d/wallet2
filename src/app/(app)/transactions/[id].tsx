import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";

import {
  Button,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
} from "@/components/ui";
import { formatMinorForInput } from "@/domain/money";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import {
  useTransaction,
  useUpdateTransaction,
} from "@/features/transactions/hooks";
import { useUndoDelete } from "@/features/transactions/undo/UndoDeleteProvider";
import { getErrorMessage } from "@/lib/appwrite/errors";

export default function EditTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transaction = useTransaction(id);
  const updateMutation = useUpdateTransaction();
  const { scheduleDelete } = useUndoDelete();

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

  const deleteWithUndo = () => {
    // Listeden ve dashboard'dan hemen kalkar; ekranın altındaki "Geri al" ile 5 saniye içinde geri alınabilir.
    scheduleDelete(current);
    router.back();
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
        isSubmitting={false}
        submitError={null}
        onSubmit={(input) => {
          // Değişiklik anında görünür; sunucuya arka planda gider. Reddedilirse geri alınır.
          updateMutation.mutate({ previous: current, input });
          router.back();
        }}
        footer={
          <Button
            title="İşlemi sil"
            variant="ghost"
            onPress={deleteWithUndo}
            fullWidth
          />
        }
      />
    </Screen>
  );
}
