import { Pressable, View } from "react-native";

import { cn } from "@/lib/cn";

import { Text, type TextTone } from "./Text";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  /** Seçiliyken yazı rengi (ör. gider için "expense"). */
  selectedTone?: TextTone;
};

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "flex-row rounded-xl bg-surface-muted p-1",
        disabled && "opacity-50",
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            className={cn(
              "min-h-[44px] flex-1 items-center justify-center rounded-lg",
              selected && "bg-surface",
            )}
          >
            <Text
              tone={selected ? (option.selectedTone ?? "default") : "muted"}
              className="font-semibold"
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
