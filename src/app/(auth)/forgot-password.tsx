import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";

import { Button, Input, Screen, Text } from "@/components/ui";
import { useRequestPasswordRecovery } from "@/features/auth/hooks";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { getErrorMessage } from "@/lib/appwrite/errors";
import { useZodForm } from "@/lib/forms/useZodForm";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const requestMutation = useRequestPasswordRecovery();
  const form = useZodForm(forgotPasswordSchema, {
    email: typeof params.email === "string" ? params.email : "",
  });

  const submit = form.handleSubmit((data) =>
    requestMutation.mutate(data, {
      onSuccess: (result) => {
        router.push({
          pathname: "/reset-password",
          params: {
            userId: result.userId,
            email: data.email,
            ...(result.phrase ? { phrase: result.phrase } : {}),
          },
        });
      },
    }),
  );

  return (
    <Screen scroll contentClassName="flex-grow justify-center">
      <View className="gap-2">
        <Text variant="display">Şifremi unuttum</Text>
        <Text tone="muted">
          Hesabına kayıtlı e-posta adresini yaz. Şifreni sıfırlaman için 6
          haneli bir kod göndereceğiz.
        </Text>
      </View>

      <Input
        label="E-posta"
        value={form.values.email}
        onChangeText={(value) => {
          form.setValue("email", value);
          if (requestMutation.isError) requestMutation.reset();
        }}
        error={form.errors.email}
        placeholder="ornek@eposta.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
      />

      {requestMutation.isError ? (
        <View
          accessibilityRole="alert"
          className="rounded-xl bg-expense/10 p-3"
        >
          <Text tone="expense">{getErrorMessage(requestMutation.error)}</Text>
        </View>
      ) : null}

      <Button
        title="Kod gönder"
        onPress={submit}
        loading={requestMutation.isPending}
        fullWidth
      />

      <Button
        title="Giriş ekranına dön"
        variant="ghost"
        onPress={() => router.back()}
        disabled={requestMutation.isPending}
        fullWidth
      />
    </Screen>
  );
}
