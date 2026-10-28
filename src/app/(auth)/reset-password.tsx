import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import {
    Button,
    Card,
    ErrorState,
    Input,
    Screen,
    Text,
    type InputRef,
} from "@/components/ui";
import {
    useConfirmPasswordRecovery,
    useRequestPasswordRecovery,
    useSignIn,
} from "@/features/auth/hooks";
import {
    RECOVERY_CODE_LENGTH,
    resetPasswordSchema,
} from "@/features/auth/schemas";
import { getErrorMessage, isAppwriteError } from "@/lib/appwrite/errors";
import { useZodForm } from "@/lib/forms/useZodForm";

const RESEND_COOLDOWN_SECONDS = 60;

type Field = "code" | "password" | "confirmPassword";

/**
 * Yanlış/süresi dolmuş/kullanılmış kod: user_invalid_token.
 * Var olmayan hesap için gönderilmiş kod: user_not_found.
 * İkisinde de AYNI mesaj: hangi e-postaların kayıtlı olduğu açığa çıkmasın.
 */
function recoveryErrorMessage(error: unknown): string {
  if (
    isAppwriteError(error, "user_invalid_token") ||
    isAppwriteError(error, "user_not_found")
  ) {
    return "Kod hatalı veya süresi dolmuş. Kodu kontrol et ya da yeni bir kod iste.";
  }
  return getErrorMessage(error);
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    userId?: string;
    email?: string;
    phrase?: string;
  }>();
  const email = typeof params.email === "string" ? params.email : "";

  const [userId, setUserId] = useState(
    typeof params.userId === "string" ? params.userId : "",
  );
  const [phrase, setPhrase] = useState(
    typeof params.phrase === "string" ? params.phrase : null,
  );
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const confirmMutation = useConfirmPasswordRecovery();
  const resendMutation = useRequestPasswordRecovery();
  const signInMutation = useSignIn();

  const passwordRef = useRef<InputRef>(null);
  const confirmRef = useRef<InputRef>(null);
  const form = useZodForm(resetPasswordSchema, {
    code: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!userId || !email) {
    return (
      <Screen contentClassName="justify-center">
        <ErrorState
          title="Sıfırlama isteği bulunamadı"
          description="Şifre sıfırlamayı baştan başlat."
          onRetry={() => router.replace("/forgot-password")}
          retryLabel="Baştan başla"
        />
      </Screen>
    );
  }

  const updateField = (field: Field, value: string) => {
    form.setValue(field, value);
    if (confirmMutation.isError) confirmMutation.reset();
  };

  const submit = form.handleSubmit((data) =>
    confirmMutation.mutate(
      { userId, code: data.code, password: data.password },
      {
        // Sıfırlama oturum açmaz; yeni şifreyle giriş yap. Başarılı olunca
        // korumalı rota kullanıcıyı ana ekrana götürür.
        onSuccess: () =>
          signInMutation.mutate({ email, password: data.password }),
      },
    ),
  );

  const resend = () =>
    resendMutation.mutate(
      { email },
      {
        onSuccess: (result) => {
          setUserId(result.userId);
          setPhrase(result.phrase);
          setCooldown(RESEND_COOLDOWN_SECONDS);
        },
      },
    );

  // Şifre değişti ama otomatik giriş başarısız oldu (ör. ağ koptu).
  if (confirmMutation.isSuccess && signInMutation.isError) {
    return (
      <Screen contentClassName="justify-center">
        <View className="gap-2">
          <Text variant="title">Şifren güncellendi</Text>
          <Text tone="muted">
            Otomatik giriş yapılamadı. Lütfen yeni şifrenle giriş yap.
          </Text>
        </View>
        <Button
          title="Giriş ekranına git"
          onPress={() => router.replace("/sign-in")}
          fullWidth
        />
      </Screen>
    );
  }

  const isSubmitting =
    confirmMutation.isPending ||
    signInMutation.isPending ||
    confirmMutation.isSuccess;

  return (
    <Screen scroll contentClassName="flex-grow justify-center">
      <View className="gap-2">
        <Text variant="display">Yeni şifre</Text>
        <Text tone="muted">
          {email} adresine kayıtlı bir hesap varsa {RECOVERY_CODE_LENGTH} haneli
          bir kod gönderdik. Kod 15 dakika geçerli. Gelen kutunda göremezsen
          istenmeyen (spam) klasörüne de bak.
        </Text>
      </View>

      {phrase ? (
        <Card>
          <Text variant="label">Güvenlik ifadesi</Text>
          <Text variant="subtitle">{phrase}</Text>
          <Text variant="caption" tone="muted">
            E-postadaki ifadeyle aynı olduğundan emin ol. Farklıysa o e-posta bu
            isteğe ait değildir.
          </Text>
        </Card>
      ) : null}

      <Input
        label="Kod"
        value={form.values.code}
        onChangeText={(value) =>
          updateField(
            "code",
            value.replace(/\D/g, "").slice(0, RECOVERY_CODE_LENGTH),
          )
        }
        error={form.errors.code}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={RECOVERY_CODE_LENGTH}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <Input
        ref={passwordRef}
        label="Yeni şifre"
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
        label="Yeni şifre (tekrar)"
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

      {confirmMutation.isError ? (
        <View
          accessibilityRole="alert"
          className="rounded-xl bg-expense/10 p-3"
        >
          <Text tone="expense">
            {recoveryErrorMessage(confirmMutation.error)}
          </Text>
        </View>
      ) : null}

      {resendMutation.isError ? (
        <View
          accessibilityRole="alert"
          className="rounded-xl bg-expense/10 p-3"
        >
          <Text tone="expense">{getErrorMessage(resendMutation.error)}</Text>
        </View>
      ) : null}

      <Button
        title="Şifreyi güncelle"
        onPress={submit}
        loading={isSubmitting}
        fullWidth
      />

      <Button
        title={
          cooldown > 0 ? `Yeni kod iste (${cooldown} sn)` : "Yeni kod iste"
        }
        variant="ghost"
        onPress={resend}
        disabled={cooldown > 0 || isSubmitting}
        loading={resendMutation.isPending}
        fullWidth
      />
    </Screen>
  );
}
