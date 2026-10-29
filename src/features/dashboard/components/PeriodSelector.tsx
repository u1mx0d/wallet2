import { View } from "react-native";

import { DateField, SegmentedControl, Text } from "@/components/ui";
import { formatPeriodLabel, type Period } from "@/domain/periods";

type PeriodKind = Period["kind"];

export type PeriodSelectorProps = {
  period: Period;
  onChange: (period: Period) => void;
  now: Date;
};

export function PeriodSelector({ period, onChange, now }: PeriodSelectorProps) {
  const changeKind = (kind: PeriodKind) => {
    if (kind === period.kind) return;
    if (kind === "custom") {
      // Varsayılan özel dönem: bu ayın başından bugüne.
      onChange({
        kind: "custom",
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
      });
    } else {
      onChange({ kind });
    }
  };

  return (
    <View className="gap-2">
      <SegmentedControl
        accessibilityLabel="Dönem"
        value={period.kind}
        onChange={changeKind}
        options={[
          { value: "week", label: "Hafta" },
          { value: "month", label: "Ay" },
          { value: "year", label: "Yıl" },
          { value: "custom", label: "Özel" },
        ]}
      />

      {period.kind === "custom" ? (
        <View className="flex-row gap-3">
          <View className="flex-1">
            <DateField
              label="Başlangıç"
              value={period.start}
              maximumDate={period.end}
              onChange={(day) => onChange({ ...period, start: day })}
            />
          </View>
          <View className="flex-1">
            <DateField
              label="Bitiş"
              value={period.end}
              maximumDate={now}
              onChange={(day) => onChange({ ...period, end: day })}
            />
          </View>
        </View>
      ) : null}

      <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
        {formatPeriodLabel(period, now)}
      </Text>
    </View>
  );
}
