import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { View } from "react-native";

import {
    Button,
    DateField,
    Input,
    SegmentedControl,
    Text,
} from "@/components/ui";
import { combineDayWithTime } from "@/domain/dates";
import { formatTry, parseTryInput } from "@/domain/money";
import { CategoryPicker } from "@/features/categories/components/CategoryPicker";
import { useCategories } from "@/features/categories/hooks";
import type { TransactionType } from "@/features/categories/schemas";
import { getErrorMessage } from "@/lib/appwrite/errors";
import { useZodForm } from "@/lib/forms/useZodForm";

import { transactionFormSchema, type TransactionInput } from "../schemas";

export type TransactionFormInitial = {
  type: TransactionType;
  /** Tutar alanında görünecek metin ("" veya formatMinorForInput çıktısı). */
  amountText: string;
  categoryId: string;
  note: string;
  date: Date;
};

export type TransactionFormProps = {
  initial: TransactionFormInitial;
  /** Düzenlemede orijinal tarih: gün değişmezse saat korunur. */
  originalDate?: Date;
  submitLabel: string;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (input: TransactionInput) => void;
  onChange?: () => void;
  footer?: ReactNode;
};

export function TransactionForm({
  initial,
  originalDate,
  submitLabel,
  isSubmitting,
  submitError,
  onSubmit,
  onChange,
  footer,
}: TransactionFormProps) {
  const router = useRouter();
  const categories = useCategories();
  const [today] = useState(() => new Date());

  const form = useZodForm(transactionFormSchema, {
    type: initial.type,
    amount: initial.amountText,
    categoryId: initial.categoryId,
    note: initial.note,
    date: initial.date.toISOString(),
  });

  const type = form.values.type === "income" ? "income" : "expense";
  const visibleCategories = (categories.data ?? []).filter(
    (category) => category.type === type,
  );

  const update = (
    field: "type" | "amount" | "categoryId" | "note" | "date",
    value: string,
  ) => {
    form.setValue(field, value);
    onChange?.();
  };

  const changeType = (next: TransactionType) => {
    update("type", next);
    // Seçili kategori yeni türe ait değilse seçimi temizle.
    const selected = categories.data?.find(
      (category) => category.id === form.values.categoryId,
    );
    if (selected && selected.type !== next) form.setValue("categoryId", "");
  };

  const parsedAmount = parseTryInput(form.values.amount);
  const amountPreview =
    parsedAmount.ok && parsedAmount.value > 0
      ? formatTry(parsedAmount.value)
      : undefined;

  const submit = form.handleSubmit(onSubmit);

  return (
    <>
      <SegmentedControl
        accessibilityLabel="İşlem türü"
        value={type}
        onChange={changeType}
        disabled={isSubmitting}
        options={[
          { value: "expense", label: "Gider", selectedTone: "expense" },
          { value: "income", label: "Gelir", selectedTone: "income" },
        ]}
      />

      <Input
        label="Tutar (₺)"
        size="lg"
        value={form.values.amount}
        onChangeText={(value) => update("amount", value)}
        error={form.errors.amount}
        hint={amountPreview}
        placeholder="0,00"
        keyboardType="decimal-pad"
        autoFocus={initial.amountText === ""}
      />

      <CategoryPicker
        categories={visibleCategories}
        selectedId={form.values.categoryId}
        onSelect={(id) => update("categoryId", id)}
        onCreate={() =>
          router.push({ pathname: "/categories/new", params: { type } })
        }
        isLoading={categories.isPending}
        error={
          form.errors.categoryId ??
          (categories.isError ? getErrorMessage(categories.error) : undefined)
        }
      />

      <DateField
        label="Tarih"
        value={new Date(form.values.date)}
        maximumDate={today}
        onChange={(day) =>
          update(
            "date",
            combineDayWithTime(day, new Date(), originalDate).toISOString(),
          )
        }
        error={form.errors.date}
      />

      <Input
        label="Not (isteğe bağlı)"
        value={form.values.note}
        onChangeText={(value) => update("note", value)}
        error={form.errors.note}
        multiline
        maxLength={500}
      />

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
