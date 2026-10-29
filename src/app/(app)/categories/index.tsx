import { Stack, useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import {
    Button,
    Card,
    ErrorState,
    Screen,
    Skeleton,
    Text,
} from "@/components/ui";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { useCategories } from "@/features/categories/hooks";
import type { Category, TransactionType } from "@/features/categories/schemas";
import { getErrorMessage } from "@/lib/appwrite/errors";

function CategorySection({
  title,
  type,
  categories,
}: {
  title: string;
  type: TransactionType;
  categories: readonly Category[];
}) {
  const router = useRouter();
  const items = categories.filter((category) => category.type === type);

  return (
    <Card>
      <Text variant="subtitle">{title}</Text>
      {items.map((category) => (
        <Pressable
          key={category.id}
          accessibilityRole="button"
          accessibilityLabel={category.name}
          accessibilityHint="Düzenlemek için dokun"
          onPress={() =>
            router.push({
              pathname: "/categories/[id]",
              params: { id: category.id },
            })
          }
          className="min-h-[52px] flex-row items-center gap-3"
        >
          <CategoryIcon icon={category.icon} color={category.color} />
          <Text className="flex-1">{category.name}</Text>
          <Text tone="muted">›</Text>
        </Pressable>
      ))}
      <Button
        title={`Yeni ${type === "income" ? "gelir" : "gider"} kategorisi`}
        variant="ghost"
        size="sm"
        onPress={() =>
          router.push({ pathname: "/categories/new", params: { type } })
        }
        fullWidth
      />
    </Card>
  );
}

export default function CategoriesScreen() {
  const categories = useCategories();

  return (
    <Screen scroll edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: true, title: "Kategoriler" }} />

      {categories.isPending ? (
        <View className="gap-3">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </View>
      ) : categories.isError ? (
        <ErrorState
          description={getErrorMessage(categories.error)}
          onRetry={() => void categories.refetch()}
          retrying={categories.isFetching}
        />
      ) : (
        <>
          <CategorySection
            title="Gider kategorileri"
            type="expense"
            categories={categories.data}
          />
          <CategorySection
            title="Gelir kategorileri"
            type="income"
            categories={categories.data}
          />
        </>
      )}
    </Screen>
  );
}
