import { useState, type ComponentRef, type Ref } from "react";
import { TextInput, View, type TextInputProps } from "react-native";

import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/ThemeProvider";

import { Text } from "./Text";

/**
 * TextInput'un ref tipi, bileşenin kendi tanımından türetilir.
 * (RN 0.88'de bu tip TextInput sınıfı değil, ayrı bir instance tipidir.)
 * Kullanım: const ref = useRef<InputRef>(null); ref.current?.focus();
 */
export type InputRef = ComponentRef<typeof TextInput>;

export type InputSize = "md" | "lg";

export type InputProps = Omit<
  TextInputProps,
  "placeholderTextColor" | "ref" | "className"
> & {
  /** Görünür etiket. Ekran okuyucu da bunu okur; boş bırakılamaz. */
  label: string;
  /** Doluysa alan kırmızı çerçeveyle gösterilir ve mesaj altında yazar. */
  error?: string;
  /** Hata yokken alanın altında gösterilen yardımcı metin. */
  hint?: string;
  /** "lg": tutar gibi öne çıkan alanlar için büyük ve kalın yazı. */
  size?: InputSize;
  ref?: Ref<InputRef>;
  /** Dış kapsayıcı için yerleşim sınıfları (margin vb.). */
  containerClassName?: string;
};

const textClasses: Record<InputSize, string> = {
  md: "text-base",
  lg: "text-2xl font-semibold",
};

/**
 * Not: Dışarıdan className ALINMAZ. Alana stil verilirse temel sınıfları (çerçeve, zemin,
 * yükseklik) ezerdi. Görünüm yalnızca size ve multiline ile değişir.
 */
export function Input({
  label,
  error,
  hint,
  size = "md",
  ref,
  containerClassName,
  editable = true,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderClass = error
    ? "border-expense"
    : focused
      ? "border-primary"
      : "border-border";

  return (
    <View className={cn("gap-1.5", containerClassName)}>
      <Text variant="label">{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholderTextColor={colors.muted}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        className={cn(
          "rounded-xl border bg-surface px-4 py-3 text-foreground",
          multiline ? "min-h-[96px]" : "min-h-[48px]",
          textClasses[size],
          borderClass,
          !editable && "opacity-50",
        )}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...rest}
      />
      {error ? (
        <Text variant="caption" tone="expense" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
