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
import { formatMinorForInput, formatTry, parseTryInput } from "@/domain/money";
import type { TradeSide } from "@/domain/portfolio";
import { useZodForm } from "@/lib/forms/useZodForm";

import { formatLots, tradeCashMinor } from "../format";
import { useQuotes } from "../hooks";
import { tradeFormSchema, type Quote, type TradeFields } from "../schemas";

import { SymbolPicker } from "./SymbolPicker";

export type TradeFormInitial = {
  side: TradeSide;
  symbol: string;
  lots: string;
  price: string;
  fee: string;
  date: Date;
};

export type TradeFormProps = {
  initial: TradeFormInitial;
  /** Düzenlemede orijinal tarih: gün değişmezse saat korunur. */
  originalDate?: Date;
  /** Sembol için eldeki lot (satış formunda bilgi ve ön kontrol). Bilinmiyorsa null. */
  availableLots: (symbol: string) => number | null;
  symbolLocked?: boolean;
  submitLabel: string;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (fields: TradeFields) => void;
  onChange?: () => void;
  footer?: ReactNode;
};

function parseLots(text: string): number | null {
  const digits = text.replace(/[\s.]/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

export function TradeForm({
  initial,
  originalDate,
  availableLots,
  symbolLocked = false,
  submitLabel,
  isSubmitting,
  submitError,
  onSubmit,
  onChange,
  footer,
}: TradeFormProps) {
  const [today] = useState(() => new Date());
  const [pickedQuote, setPickedQuote] = useState<Quote | null>(null);
  const initialQuotes = useQuotes(initial.symbol ? [initial.symbol] : []);

  const form = useZodForm(tradeFormSchema, {
    symbol: initial.symbol,
    side: initial.side,
    lots: initial.lots,
    price: initial.price,
    fee: initial.fee,
    date: initial.date.toISOString(),
  });

  const side: TradeSide = form.values.side === "sell" ? "sell" : "buy";
  const symbol = form.values.symbol;
  const quote =
    pickedQuote?.symbol === symbol
      ? pickedQuote
      : initialQuotes.data?.find((item) => item.symbol === symbol);

  const changed = () => onChange?.();

  const selectQuote = (next: Quote | null) => {
    setPickedQuote(next);
    if (!next) {
      form.setFields({ symbol: "" });
    } else if (form.values.price.trim() === "") {
      // Fiyat boşsa güncel fiyatı öner. İki alan TEK seferde değişmeli.
      form.setFields({
        symbol: next.symbol,
        price: formatMinorForInput(next.priceMinor),
      });
    } else {
      form.setFields({ symbol: next.symbol });
    }
    changed();
  };

  // Önizleme ve satış ön kontrolü (asıl kontrol sunucuda).
  const lots = parseLots(form.values.lots);
  const price = parseTryInput(form.values.price);
  const fee =
    form.values.fee.trim() === ""
      ? ({ ok: true, value: 0 } as const)
      : parseTryInput(form.values.fee);
  const cash =
    lots !== null && lots > 0 && price.ok && price.value > 0 && fee.ok
      ? tradeCashMinor({
          side,
          lots,
          priceMinor: price.value,
          feeMinor: fee.value,
        })
      : null;

  const available = symbol ? availableLots(symbol) : null;
  const oversellWarning =
    side === "sell" && available !== null && lots !== null && lots > available
      ? `Eldeki lot ${formatLots(available)}; daha fazlası satılamaz.`
      : null;

  const submit = form.handleSubmit(onSubmit);

  return (
    <>
      <SegmentedControl
        accessibilityLabel="İşlem türü"
        value={side}
        onChange={(value) => {
          form.setValue("side", value);
          changed();
        }}
        disabled={isSubmitting}
        options={[
          { value: "buy", label: "Alım", selectedTone: "income" },
          { value: "sell", label: "Satım", selectedTone: "expense" },
        ]}
      />

      <SymbolPicker
        symbol={symbol}
        quote={quote}
        onSelect={selectQuote}
        error={form.errors.symbol}
        locked={symbolLocked}
      />

      {side === "sell" && symbol && available !== null ? (
        <Text variant="caption" tone="muted">
          Eldeki: {formatLots(available)} lot
        </Text>
      ) : null}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Lot"
            value={form.values.lots}
            onChangeText={(value) => {
              form.setValue("lots", value);
              changed();
            }}
            error={form.errors.lots ?? oversellWarning ?? undefined}
            placeholder="0"
            keyboardType="number-pad"
          />
        </View>
        <View className="flex-1">
          <Input
            label="Fiyat (₺)"
            value={form.values.price}
            onChangeText={(value) => {
              form.setValue("price", value);
              changed();
            }}
            error={form.errors.price}
            placeholder="0,00"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <Input
        label="Komisyon (₺, isteğe bağlı)"
        value={form.values.fee}
        onChangeText={(value) => {
          form.setValue("fee", value);
          changed();
        }}
        error={form.errors.fee}
        placeholder="0,00"
        keyboardType="decimal-pad"
      />

      <DateField
        label="Tarih"
        value={new Date(form.values.date)}
        maximumDate={today}
        onChange={(day) => {
          form.setValue(
            "date",
            combineDayWithTime(day, new Date(), originalDate).toISOString(),
          );
          changed();
        }}
        error={form.errors.date}
      />

      {cash !== null ? (
        <View className="rounded-xl bg-surface-muted p-3">
          <Text tone="muted">
            {side === "buy"
              ? "Ödenecek tutar (komisyon dahil)"
              : "Alınacak tutar (komisyon düşülmüş)"}
          </Text>
          <Text variant="subtitle" numeric>
            {formatTry(cash)}
          </Text>
        </View>
      ) : null}

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
