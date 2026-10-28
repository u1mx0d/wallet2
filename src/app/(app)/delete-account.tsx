import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button, Card, Input, Screen, Text } from "@/components/ui";
import { AccountDeletionError } from "@/features/auth/api";
import { useDeleteAccount } from "@/features/auth/hooks";
import { getErrorMessage } from "@/lib/appwrite/errors";

const CONFIRMATION_WORD = "SİL";

/** Türkçe büyük harf kuralıyla karşılaştırır: "sil" → "SİL". */
function isConfirmed(value: string): boolean {
  return value.trim().toLocaleUpperCase("tr-TR") === CONFIRMATION_WORD;
}

function deletionErrorMessage(error: unknown): string {
  if (error instanceof AccountDeletionError) {
    return "Hesabın silinemedi. Verilerinin bir kısmı silinmiş olabilir; lütfen tekrar dene. Sorun sürerse bizimle iletişime geç.";
  }
  return getErrorMessage(error);
}

export default function DeleteAccountScreen() {
  const router = useRouter();
  const deleteMutation = useDeleteAccount();
  const [confirmation, setConfirmation] = useState("");

  const canDelete = isConfirmed(confirmation);

  return (
    <Screen scroll>
      <View className="gap-2">
        <Text variant="display">Hesabı sil</Text>
        <Text tone="muted">Bu işlem geri alınamaz.</Text>
      </View>

      <Card>
        <Text variant="subtitle">Kalıcı olarak silinecekler</Text>
        <Text>• Hesabın ve giriş bilgilerin</Text>
        <Text>• Tüm gelir ve gider kayıtların</Text>
        <Text>• Kategorilerin</Text>
        <Text>• Tüm yatırım alım/satım işlemlerin</Text>
      </Card>

      <Input
        label={`Onaylamak için "${CONFIRMATION_WORD}" yaz`}
        value={confirmation}
        onChangeText={(value) => {
          setConfirmation(value);
          if (deleteMutation.isError) deleteMutation.reset();
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        editable={!deleteMutation.isPending}
      />

      {deleteMutation.isError ? (
        <View
          accessibilityRole="alert"
          className="rounded-xl bg-expense/10 p-3"
        >
          <Text tone="expense">
            {deletionErrorMessage(deleteMutation.error)}
          </Text>
        </View>
      ) : null}

      <Button
        title="Hesabımı kalıcı olarak sil"
        variant="danger"
        onPress={() => deleteMutation.mutate()}
        disabled={!canDelete}
        loading={deleteMutation.isPending}
        fullWidth
      />

      <Button
        title="Vazgeç"
        variant="ghost"
        onPress={() => router.back()}
        disabled={deleteMutation.isPending}
        fullWidth
      />
    </Screen>
  );
}
