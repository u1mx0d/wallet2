import { Pressable, View } from "react-native";

import { Skeleton, Text } from "@/components/ui";
import { cn } from "@/lib/cn";

import type { Category } from "../schemas";

import { CategoryIcon } from "./CategoryIcon";

export type CategoryPickerProps = {
  categories: readonly Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate?: () => void;
  isLoading?: boolean;
  error?: string;
};

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  onCreate,
  isLoading = false,
  error,
}: CategoryPickerProps) {
  return (
    <View className="gap-1.5">
      <Text variant="label">Kategori</Text>

      {isLoading ? (
        <View className="flex-row flex-wrap gap-2">
          <Skeleton className="h-11 w-28 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </View>
      ) : (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Kategori"
          className="flex-row flex-wrap gap-2"
        >
          {categories.map((category) => {
            const selected = category.id === selectedId;
            return (
              <Pressable
                key={category.id}
                accessibilityRole="radio"
                accessibilityLabel={category.name}
                accessibilityState={{ selected }}
                onPress={() => onSelect(category.id)}
                className={cn(
                  "min-h-[44px] flex-row items-center gap-2 rounded-full border px-3",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface",
                )}
              >
                <CategoryIcon
                  icon={category.icon}
                  color={category.color}
                  size="sm"
                />
                <Text className={cn(selected && "font-semibold")}>
                  {category.name}
                </Text>
              </Pressable>
            );
          })}

          {onCreate ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Yeni kategori ekle"
              onPress={onCreate}
              className="min-h-[44px] flex-row items-center rounded-full border border-dashed border-border px-4"
            >
              <Text tone="primary" className="font-semibold">
                + Yeni
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {error ? (
        <Text variant="caption" tone="expense" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
