import { useMemo, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { z } from "zod";

import { Button, Input, SegmentedControl, Text } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useZodForm } from "@/lib/forms/useZodForm";

import { CATEGORY_COLORS, CATEGORY_ICON_KEYS } from "../constants";
import {
    categoryInputSchema,
    type Category,
    type CategoryInput,
    type TransactionType,
} from "../schemas";

import { CategoryIcon } from "./CategoryIcon";

export type CategoryFormValues = {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
};

export type CategoryFormProps = {
  initial: CategoryFormValues;
  /** Aynı adı tekrar kullanmayı engellemek için mevcut kategoriler. */
  existing: readonly Category[];
  /** Düzenlemede kendisiyle çakışma sayılmasın. */
  editingId?: string;
  /** Tür yalnızca yeni kategoride seçilebilir. */
  typeEditable: boolean;
  submitLabel: string;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (input: CategoryInput) => void;
  onChange?: () => void;
  footer?: ReactNode;
};

function sameName(a: string, b: string): boolean {
  return (
    a.trim().toLocaleLowerCase("tr-TR") === b.trim().toLocaleLowerCase("tr-TR")
  );
}

export function CategoryForm({
  initial,
  existing,
  editingId,
  typeEditable,
  submitLabel,
  isSubmitting,
  submitError,
  onSubmit,
  onChange,
  footer,
}: CategoryFormProps) {
  const schema = useMemo(
    () =>
      categoryInputSchema.superRefine((value, ctx) => {
        const duplicate = existing.some(
          (category) =>
            category.id !== editingId &&
            category.type === value.type &&
            sameName(category.name, value.name),
        );
        if (duplicate) {
          ctx.addIssue({
            code: "custom",
            path: ["name"],
            message: "Bu adla bir kategori zaten var.",
          });
        }
      }),
    [existing, editingId],
  );

  const form = useZodForm(schema, initial);

  const update = (field: keyof CategoryFormValues, value: string) => {
    form.setValue(field, value);
    onChange?.();
  };

  const submit = form.handleSubmit(onSubmit);

  return (
    <>
      <View className="flex-row items-center gap-3">
        <CategoryIcon icon={form.values.icon} color={form.values.color} />
        <Text variant="subtitle" className="flex-1" numberOfLines={1}>
          {form.values.name.trim() || "Yeni kategori"}
        </Text>
      </View>

      {typeEditable ? (
        <SegmentedControl
          accessibilityLabel="Kategori türü"
          value={form.values.type}
          onChange={(value) => update("type", value)}
          options={[
            { value: "expense", label: "Gider", selectedTone: "expense" },
            { value: "income", label: "Gelir", selectedTone: "income" },
          ]}
        />
      ) : (
        <Text tone="muted">
          Tür: {form.values.type === "income" ? "Gelir" : "Gider"}{" "}
          (değiştirilemez)
        </Text>
      )}

      <Input
        label="Ad"
        value={form.values.name}
        onChangeText={(value) => update("name", value)}
        error={form.errors.name}
        autoCapitalize="sentences"
        returnKeyType="done"
      />

      <View className="gap-1.5">
        <Text variant="label">İkon</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="İkon"
          className="flex-row flex-wrap gap-2"
        >
          {CATEGORY_ICON_KEYS.map((key) => {
            const selected = key === form.values.icon;
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityLabel={`İkon: ${key}`}
                accessibilityState={{ selected }}
                onPress={() => update("icon", key)}
                className={cn(
                  "h-[48px] w-[48px] items-center justify-center rounded-xl border",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-transparent",
                )}
              >
                <CategoryIcon icon={key} color={form.values.color} />
              </Pressable>
            );
          })}
        </View>
        {form.errors.icon ? (
          <Text variant="caption" tone="expense">
            {form.errors.icon}
          </Text>
        ) : null}
      </View>

      <View className="gap-1.5">
        <Text variant="label">Renk</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Renk"
          className="flex-row flex-wrap gap-2"
        >
          {CATEGORY_COLORS.map((color, index) => {
            const selected = color === form.values.color;
            return (
              <Pressable
                key={color}
                accessibilityRole="radio"
                accessibilityLabel={`Renk ${index + 1}`}
                accessibilityState={{ selected }}
                onPress={() => update("color", color)}
                className={cn(
                  "h-[44px] w-[44px] items-center justify-center rounded-full border-2",
                  selected ? "border-foreground" : "border-transparent",
                )}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: color,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      {submitError ? (
        <View
          accessibilityRole="alert"
          className="rounded-xl bg-expense/10 p-3"
        >
          <Text tone="expense">{submitError}</Text>
        </View>
      ) : null}

      <Button
        title={submitLabel}
        onPress={submit}
        loading={isSubmitting}
        fullWidth
      />

      {footer}
    </>
  );
}

export type { z };
