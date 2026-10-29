import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Alert, View } from "react-native";

import {
    Button,
    EmptyState,
    ErrorState,
    Screen,
    Skeleton,
    Text,
} from "@/components/ui";
import { CategoryInUseError } from "@/features/categories/api";
import { CategoryForm } from "@/features/categories/components/CategoryForm";
import {
    useCategories,
    useDeleteCategory,
    useUpdateCategory,
} from "@/features/categories/hooks";
import { getErrorMessage } from "@/lib/appwrite/errors";

function deleteErrorMessage(error: unknown): string {
  if (error instanceof CategoryInUseError) {
    return "Bu kategoriye bağlı işlemler var. Kategoriyi silmek için önce bu işlemleri başka bir kategoriye taşı veya sil.";
  }
  return getErrorMessage(error);
}

export default function EditCategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const categories = useCategories();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  useEffect(() => {
    if (updateMutation.isPaused) router.back();
  }, [updateMutation.isPaused, router]);

  const header = (
    <Stack.Screen
      options={{ headerShown: true, title: "Kategoriyi düzenle" }}
    />
  );

  if (categories.isPending) {
    return (
      <Screen edges={["bottom"]}>
        {header}
        <Skeleton className="h-48 w-full rounded-2xl" />
      </Screen>
    );
  }

  if (categories.isError) {
    return (
      <Screen edges={["bottom"]} contentClassName="justify-center">
        {header}
        <ErrorState
          description={getErrorMessage(categories.error)}
          onRetry={() => void categories.refetch()}
          retrying={categories.isFetching}
        />
      </Screen>
    );
  }

  const category = categories.data.find((item) => item.id === id);
  if (!category) {
    return (
      <Screen edges={["bottom"]} contentClassName="justify-center">
        {header}
        <EmptyState
          title="Kategori bulunamadı"
          description="Bu kategori silinmiş olabilir."
          actionLabel="Geri dön"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const confirmDelete = () => {
    Alert.alert(
      "Kategoriyi sil",
      `"${category.name}" kategorisi silinsin mi?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () =>
            deleteMutation.mutate(
              { id: category.id },
              { onSuccess: () => router.back() },
            ),
        },
      ],
    );
  };

  return (
    <Screen scroll edges={["bottom"]}>
      {header}
      <CategoryForm
        initial={{
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
        }}
        existing={categories.data}
        editingId={category.id}
        typeEditable={false}
        submitLabel="Değişiklikleri kaydet"
        isSubmitting={updateMutation.isPending && !updateMutation.isPaused}
        submitError={
          updateMutation.isError ? getErrorMessage(updateMutation.error) : null
        }
        onChange={() => {
          if (updateMutation.isError) updateMutation.reset();
          if (deleteMutation.isError) deleteMutation.reset();
        }}
        onSubmit={({ name, icon, color }) =>
          updateMutation.mutate(
            { previous: category, input: { name, icon, color } },
            { onSuccess: () => router.back() },
          )
        }
        footer={
          <View className="gap-2">
            {deleteMutation.isError ? (
              <View
                accessibilityRole="alert"
                className="rounded-xl bg-expense/10 p-3"
              >
                <Text tone="expense">
                  {deleteErrorMessage(deleteMutation.error)}
                </Text>
              </View>
            ) : null}
            <Button
              title="Kategoriyi sil"
              variant="ghost"
              onPress={confirmDelete}
              loading={deleteMutation.isPending}
              disabled={updateMutation.isPending}
              fullWidth
            />
          </View>
        }
      />
    </Screen>
  );
}
