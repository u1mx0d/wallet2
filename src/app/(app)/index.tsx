import { useRouter } from "expo-router";
import { Alert, View } from "react-native";

import { Button, Card, Screen, Text } from "@/components/ui";
import { useSession, useSignOut } from "@/features/auth/hooks";
import { getErrorMessage } from "@/lib/appwrite/errors";

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
        <Text tone="muted">
          Giriş başarılı. Dashboard ADIM 5'te burada olacak.
        </Text>
      </View>

      <Card>
        <Text variant="subtitle">Hesap</Text>
        <Text tone="muted">E-posta: {user?.email}</Text>
        <Text variant="caption" tone="muted">
          Kullanıcı ID: {user?.$id}
        </Text>
      </Card>

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
