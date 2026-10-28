import { useState } from "react";
import { View } from "react-native";

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Screen,
  Skeleton,
  Text,
} from "@/components/ui";
import { env } from "@/lib/env";
import { useTheme } from "@/theme/ThemeProvider";

export default function ComponentShowcaseScreen() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);

  const nameError =
    touched && name.trim().length === 0 ? "Bu alan zorunlu." : undefined;

  return (
    <Screen scroll>
      <View className="gap-1">
        <Text variant="display">Bileşenler</Text>
        <Text tone="muted">Tema: {theme === "dark" ? "Koyu" : "Açık"}</Text>
      </View>

      <Card>
        <Text variant="subtitle">Env</Text>
        <Text variant="caption" tone="muted">
          Endpoint: {env.appwriteEndpoint}
        </Text>
        <Text variant="caption" tone="muted">
          Project: {env.appwriteProjectId}
        </Text>
        <Text variant="caption" tone="muted">
          Database: {env.appwriteDatabaseId}
        </Text>
        <Text variant="caption" tone="muted">
          Platform: {env.appwritePlatform}
        </Text>
      </Card>

      <Card>
        <Text variant="subtitle">Butonlar</Text>
        <Button
          title="Birincil"
          fullWidth
          onPress={() => setLoading((value) => !value)}
        />
        <Button title="İkincil" variant="secondary" fullWidth />
        <Button title="Hayalet" variant="ghost" fullWidth />
        <Button title="Sil" variant="danger" fullWidth />
        <Button title="Kaydediliyor" loading={loading} fullWidth />
        <Button title="Devre dışı" disabled fullWidth />
        <Text variant="caption" tone="muted">
          "Birincil" butonuna basınca "Kaydediliyor" butonu yükleniyor durumuna
          geçer.
        </Text>
      </Card>

      <Card>
        <Text variant="subtitle">Form alanı</Text>
        <Input
          label="Ad"
          placeholder="Adını yaz"
          value={name}
          onChangeText={setName}
          onBlur={() => setTouched(true)}
          error={nameError}
          hint="Alana dokunup boş bırakarak çıkarsan hata görünür."
          autoCapitalize="words"
          returnKeyType="done"
        />
        <Input label="Devre dışı alan" value="Düzenlenemez" editable={false} />
      </Card>

      <Card>
        <Text variant="subtitle">Tutarlar</Text>
        <View className="flex-row justify-between">
          <Text tone="muted">Gelir</Text>
          <Text tone="income" numeric className="font-semibold">
            +₺12.500,00
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text tone="muted">Gider</Text>
          <Text tone="expense" numeric className="font-semibold">
            −₺3.240,75
          </Text>
        </View>
      </Card>

      <Card>
        <EmptyState
          title="Henüz işlem yok"
          description="İlk gelir veya giderini ekleyerek başla."
          actionLabel="İşlem ekle"
          onAction={() => undefined}
        />
      </Card>

      <Card>
        <ErrorState onRetry={() => setRetryCount((count) => count + 1)} />
        <Text variant="caption" tone="muted" className="text-center">
          Tekrar deneme sayısı: {retryCount}
        </Text>
      </Card>

      <Card>
        <Text variant="subtitle">Skeleton</Text>
        {showSkeleton ? (
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </View>
            </View>
            <Skeleton className="h-20 w-full rounded-xl" />
          </View>
        ) : null}
        <Button
          title={showSkeleton ? "Skeleton'ı gizle" : "Skeleton'ı göster"}
          variant="secondary"
          size="sm"
          onPress={() => setShowSkeleton((value) => !value)}
        />
      </Card>
    </Screen>
  );
}
