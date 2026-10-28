import { useRouter } from "expo-router";
import { useRef } from "react";
import { View } from "react-native";

import { Button, Input, Screen, Text, type InputRef } from "@/components/ui";
import { useSignUp } from "@/features/auth/hooks";
import { signUpSchema } from "@/features/auth/schemas";
import { getErrorMessage } from "@/lib/appwrite/errors";
import { useZodForm } from "@/lib/forms/useZodForm";

type Field = "name" | "email" | "password" | "confirmPassword";

export default function SignUpScreen() {
  const router = useRouter();
  const signUpMutation = useSignUp();
  const emailRef = useRef<InputRef>(null);
  const passwordRef = useRef<InputRef>(null);
  const confirmRef = useRef<InputRef>(null);
  const form = useZodForm(signUpSchema, {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const updateField = (field: Field, value: string) => {
    form.setValue(field, value);
    if (signUpMutation.isError) signUpMutation.reset();
  };

  const submit = form.handleSubmit((data) => signUpMutation.mutate(data));

  const goToSignIn = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/sign-in");
  };

  return (
    <Screen scroll contentClassName="flex-grow justify-center">
      <View className="gap-2">
        <Text variant="display">Hesap oluştur</Text>
        <Text tone="muted">
          Gelir, gider ve yatırımlarını tek yerden takip et.
        </Text>
      </View>

      <Input
        label="Ad"
        value={form.values.name}
        onChangeText={(value) => updateField("name", value)}
        error={form.errors.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />

      <Input
        ref={emailRef}
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
        hint="En az 8 karakter."
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />

      <Input
        ref={confirmRef}
        label="Şifre (tekrar)"
        value={form.values.confirmPassword}
        onChangeText={(value) => updateField("confirmPassword", value)}
        error={form.errors.confirmPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      {signUpMutation.isError ? (
        <View
          accessibilityRole="alert"
          className="rounded-xl bg-expense/10 p-3"
        >
          <Text tone="expense">{getErrorMessage(signUpMutation.error)}</Text>
        </View>
      ) : null}

      <Button
        title="Kayıt ol"
        onPress={submit}
        loading={signUpMutation.isPending}
        fullWidth
      />

      <Button
        title="Zaten hesabın var mı? Giriş yap"
        variant="ghost"
        onPress={goToSignIn}
        disabled={signUpMutation.isPending}
        fullWidth
      />
    </Screen>
  );
}
