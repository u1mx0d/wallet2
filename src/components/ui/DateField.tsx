import DateTimePicker, {
    DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Platform, Pressable, View } from "react-native";

import { formatDayLabel, formatFullDate } from "@/domain/dates";

import { Text } from "./Text";

export type DateFieldProps = {
  label: string;
  value: Date;
  /** Kullanıcı bir gün seçtiğinde çağrılır (saat bilgisi önemsizdir). */
  onChange: (day: Date) => void;
  maximumDate?: Date;
  error?: string;
};

/**
 * Android: dokununca sistemin tarih penceresi açılır.
 * iOS: platformun kompakt tarih seçicisi gösterilir.
 */
export function DateField({
  label,
  value,
  onChange,
  maximumDate,
  error,
}: DateFieldProps) {
  const now = new Date();

  const field =
    Platform.OS === "ios" ? (
      <View className="flex-row">
        <DateTimePicker
          value={value}
          mode="date"
          display="compact"
          locale="tr-TR"
          maximumDate={maximumDate}
          accessibilityLabel={label}
          onChange={(event, date) => {
            if (event.type === "set" && date) onChange(date);
          }}
        />
      </View>
    ) : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatFullDate(value)}`}
        accessibilityHint="Tarih seçmek için dokun"
        onPress={() =>
          DateTimePickerAndroid.open({
            value,
            mode: "date",
            maximumDate,
            onChange: (event, date) => {
              if (event.type === "set" && date) onChange(date);
            },
          })
        }
        className="min-h-[48px] justify-center rounded-xl border border-border bg-surface px-4"
      >
        <Text>
          {formatDayLabel(value, now)}
          {formatDayLabel(value, now) !== formatFullDate(value) ? (
            <Text tone="muted"> · {formatFullDate(value)}</Text>
          ) : null}
        </Text>
      </Pressable>
    );

  return (
    <View className="gap-1.5">
      <Text variant="label">{label}</Text>
      {field}
      {error ? (
        <Text variant="caption" tone="expense" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
