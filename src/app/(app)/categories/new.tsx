import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { Screen } from "@/components/ui";
import { newCategoryId } from "@/features/categories/api";
import { CategoryForm } from "@/features/categories/components/CategoryForm";
import { CATEGORY_COLORS } from "@/features/categories/constants";
import { useCategories, useCreateCategory } from "@/features/categories/hooks";
import { getErrorMessage } from "@/lib/appwrite/errors";

export default function NewCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const type = params.type === "income" ? "income" : "expense";
  const categories = useCategories();
  const createMutation = useCreateCategory();
  const [id] = useState(newCategoryId);

  useEffect(() => {
    if (createMutation.isPaused) router.back();
  }, [createMutation.isPaused, router]);

  return (
    <Screen scroll edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: true, title: "Yeni kategori" }} />
      <CategoryForm
        initial={{ name: "", type, icon: "dots", color: CATEGORY_COLORS[4] }}
        existing={categories.data ?? []}
        typeEditable
        submitLabel="Kategoriyi ekle"
        isSubmitting={createMutation.isPending && !createMutation.isPaused}
        submitError={
          createMutation.isError ? getErrorMessage(createMutation.error) : null
        }
        onChange={() => {
          if (createMutation.isError) createMutation.reset();
        }}
        onSubmit={(input) =>
          createMutation.mutate(
            { id, input },
            { onSuccess: () => router.back() },
          )
        }
      />
    </Screen>
  );
}
