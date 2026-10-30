import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import { Screen } from "@/components/ui";
import { newTransactionId } from "@/features/transactions/api";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import { useCreateTransaction } from "@/features/transactions/hooks";

export default function NewTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const type = params.type === "income" ? "income" : "expense";
  const createMutation = useCreateTransaction();

  // ID ekran açılınca BİR KEZ üretilir: istek tekrar gönderilirse sunucuda ikinci kayıt oluşmaz.
  const [id] = useState(newTransactionId);
  const [initialDate] = useState(() => new Date());

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
        isSubmitting={false}
        submitError={null}
        onSubmit={(input) => {
          // Kayıt listede ve dashboard'da anında görünür; sunucuya arka planda gider.
          // Sunucu reddederse kayıt geri alınır ve ana ekrandaki şerit uyarır.
          createMutation.mutate({ id, input });
          router.back();
        }}
      />
    </Screen>
  );
}
