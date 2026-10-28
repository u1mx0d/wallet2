import { useRouter } from "expo-router";
import { useRef } from "react";
import { View } from "react-native";

import { Button, Input, Screen, Text, type InputRef } from "@/components/ui";
import { useSignIn } from "@/features/auth/hooks";
import { signInSchema } from "@/features/auth/schemas";
import { getErrorMessage } from "@/lib/appwrite/errors";
import { useZodForm } from "@/lib/forms/useZodForm";

export default function SignInScreen() {
  const router = useRouter();
  const signInMutation = useSignIn();
  const passwordRef = useRef<InputRef>(null);
  const form = useZodForm(signInSchema, { email: "", password: "" });

  const updateField = (field: "email" | "password", value: string) => {
    form.setValue(field, value);
    if (signInMutation.isError) signInMutation.reset();
  };

  const submit = form.handleSubmit((data) => signInMutation.mutate(data));

  return (
    <Screen scroll contentClassName="flex-grow justify-center">
      <View className="gap-2">
        <Text variant="display">Giriş yap</Text>
        <Text tone="muted">
          Cüzdanına erişmek için e-posta adresini ve şifreni gir.
        </Text>
      </View>

      <Input
        label="E-posta"
        value={form.values.email}
        onChangeText={(value) => updateField("email", value)}
        error={form.errors.email}
        placeholder="ornek@eposta.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <Input
        ref={passwordRef}
        label="Şifre"
        value={form.values.password}
        onChangeText={(value) => updateField("password", value)}
        error={form.errors.password}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      {signInMutation.isError ? (
        <View
          accessibilityRole="alert"
          className="rounded-xl bg-expense/10 p-3"
        >
          <Text tone="expense">{getErrorMessage(signInMutation.error)}</Text>
        </View>
      ) : null}

      <Button
        title="Giriş yap"
        onPress={submit}
        loading={signInMutation.isPending}
        fullWidth
      />

      <Button
        title="Hesabın yok mu? Kayıt ol"
        variant="ghost"
        onPress={() => router.push("/sign-up")}
        disabled={signInMutation.isPending}
        fullWidth
      />
    </Screen>
  );
}
