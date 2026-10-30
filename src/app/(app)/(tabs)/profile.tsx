import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

import {
  Button,
  Card,
  Input,
  Screen,
  SegmentedControl,
  Text,
} from "@/components/ui";
import { useSession, useSignOut } from "@/features/auth/hooks";
import { InvestmentDisclaimer } from "@/features/portfolio/components/InvestmentDisclaimer";
import { useUpdateName } from "@/features/profile/hooks";
import { profileNameSchema } from "@/features/profile/schemas";
import { useUndoDelete } from "@/features/transactions/undo/UndoDeleteProvider";
import { getErrorMessage } from "@/lib/appwrite/errors";
import { useZodForm } from "@/lib/forms/useZodForm";
import { useTheme, type ThemePreference } from "@/theme/ThemeProvider";

function NameEditor({
  initialName,
  onDone,
}: {
  initialName: string;
  onDone: () => void;
}) {
  const mutation = useUpdateName();
  const form = useZodForm(profileNameSchema, { name: initialName });
  const submit = form.handleSubmit((data) =>
    mutation.mutate(data.name, { onSuccess: onDone }),
  );

  return (
    <View className="gap-3">
      <Input
        label="Ad"
        value={form.values.name}
        onChangeText={(value) => {
          form.setValue("name", value);
          if (mutation.isError) mutation.reset();
        }}
        error={
          form.errors.name ??
          (mutation.isError ? getErrorMessage(mutation.error) : undefined)
        }
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="done"
        onSubmitEditing={submit}
        autoFocus
      />
      <View className="flex-row gap-3">
        <Button
          title="Kaydet"
          className="flex-1"
          onPress={submit}
          loading={mutation.isPending}
        />
        <Button
          title="Vazgeç"
          variant="ghost"
          className="flex-1"
          onPress={onDone}
          disabled={mutation.isPending}
        />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const session = useSession();
  const signOutMutation = useSignOut();
  const { flushPendingDelete } = useUndoDelete();
  const { preference, setPreference } = useTheme();
  const [editingName, setEditingName] = useState(false);

  const user = session.data;
  const version = Constants.expoConfig?.version ?? "—";

  const confirmSignOut = () => {
    Alert.alert(
      "Çıkış yap",
      "Hesabından çıkmak istediğine emin misin? Bağlantı bekleyen değişikliklerin varsa çıkış yapınca silinir.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Çıkış yap",
          style: "destructive",
          onPress: () => {
            // Geri alma süresi dolmamış bir silme varsa oturum kapanmadan gönder.
            flushPendingDelete();
            signOutMutation.mutate();
          },
        },
      ],
    );
  };

  return (
    <Screen scroll edges={[]}>
      <Card>
        <Text variant="subtitle">Hesap</Text>
        {editingName ? (
          <NameEditor
            initialName={user?.name ?? ""}
            onDone={() => setEditingName(false)}
          />
        ) : (
          <View className="flex-row items-center gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="font-semibold">{user?.name || "Adsız"}</Text>
              <Text variant="caption" tone="muted">
                {user?.email}
              </Text>
            </View>
            <Button
              title="Adı değiştir"
              variant="ghost"
              size="sm"
              onPress={() => setEditingName(true)}
            />
          </View>
        )}
      </Card>

      <Card>
        <Text variant="subtitle">Görünüm</Text>
        <SegmentedControl<ThemePreference>
          accessibilityLabel="Tema"
          value={preference}
          onChange={setPreference}
          options={[
            { value: "system", label: "Sistem" },
            { value: "light", label: "Açık" },
            { value: "dark", label: "Koyu" },
          ]}
        />
        <Text variant="caption" tone="muted">
          "Sistem" seçiliyken uygulama telefonunun temasını izler.
        </Text>
      </Card>

      <Card>
        <Text variant="subtitle">Ayarlar</Text>
        <Button
          title="Kategorileri yönet"
          variant="secondary"
          onPress={() => router.push("/categories")}
          fullWidth
        />
      </Card>

      <Card>
        <Text variant="subtitle">Hakkında</Text>
        <Text tone="muted">Sürüm {version}</Text>
        <InvestmentDisclaimer />
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
