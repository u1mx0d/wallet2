import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { Screen } from "@/components/ui";
import { newTransactionId } from "@/features/transactions/api";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import { useCreateTransaction } from "@/features/transactions/hooks";
import { getErrorMessage } from "@/lib/appwrite/errors";

export default function NewTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const type = params.type === "income" ? "income" : "expense";
  const createMutation = useCreateTransaction();

  // ID ekran açılınca BİR KEZ üretilir: kullanıcı hata sonrası tekrar denerse aynı ID gider,
  // önceki deneme sunucuya ulaşmışsa ikinci kayıt oluşmaz.
  const [id] = useState(newTransactionId);
  const [initialDate] = useState(() => new Date());

  // Çevrimdışı: istek beklemeye alındı; kayıt listede görünüyor, ekranı kapat.
  useEffect(() => {
    if (createMutation.isPaused) router.back();
  }, [createMutation.isPaused, router]);

  return (
    <Screen scroll edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: type === "income" ? "Gelir ekle" : "Gider ekle",
        }}
      />
      <TransactionForm
        initial={{
          type,
          amountText: "",
          categoryId: "",
          note: "",
          date: initialDate,
        }}
        submitLabel="Kaydet"
        isSubmitting={createMutation.isPending && !createMutation.isPaused}
        submitError={
          createMutation.isError ? getErrorMessage(createMutation.error) : null
        }
        onChange={() => {
          if (createMutation.isError) createMutation.reset();
        }}
        onSubmit={(input) =>
          createMutation.mutate(
            { id, input },
            { onSuccess: () => router.back() },
          )
        }
      />
    </Screen>
  );
}
