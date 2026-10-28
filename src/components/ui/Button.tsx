import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
} from "react-native";

import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/ThemeProvider";
import type { ColorToken } from "@/theme/tokens";

import { Text, type TextTone } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

const containerClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary",
  secondary: "border border-border bg-surface",
  ghost: "bg-transparent",
  danger: "bg-expense",
};

const textTones: Record<ButtonVariant, TextTone> = {
  primary: "onPrimary",
  secondary: "default",
  ghost: "primary",
  danger: "onPrimary",
};

const spinnerColors: Record<ButtonVariant, ColorToken> = {
  primary: "on-primary",
  secondary: "foreground",
  ghost: "primary",
  danger: "on-primary",
};

// Dokunma alanı: md 48px, sm 44px (Apple ve Google'ın önerdiği minimum ~44-48px).
const sizeClasses: Record<ButtonSize, string> = {
  md: "min-h-[48px] px-5",
  sm: "min-h-[44px] px-4",
};

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** true iken buton basılamaz ve yükleniyor göstergesi çıkar. */
  loading?: boolean;
  /** Butonu bulunduğu alanın tüm genişliğine yayar. */
  fullWidth?: boolean;
  /** Yalnızca yerleşim için (margin, hizalama). Renk için variant kullan. */
  className?: string;
};

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);
  const isDisabled = Boolean(disabled) || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      className={cn(fullWidth && "self-stretch", className)}
      {...rest}
    >
      <View
        className={cn(
          "flex-row items-center justify-center gap-2 rounded-xl",
          sizeClasses[size],
          containerClasses[variant],
          isDisabled && "opacity-50",
          pressed && !isDisabled && "opacity-80",
        )}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={colors[spinnerColors[variant]]}
          />
        ) : null}
        <Text
          variant="body"
          tone={textTones[variant]}
          className="font-semibold"
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
