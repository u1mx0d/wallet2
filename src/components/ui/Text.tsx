import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { cn } from "@/lib/cn";

const variantClasses = {
  display: "text-3xl font-bold",
  title: "text-xl font-semibold",
  subtitle: "text-lg font-semibold",
  body: "text-base",
  label: "text-sm font-medium",
  caption: "text-sm",
} as const;

const toneClasses = {
  default: "text-foreground",
  muted: "text-muted",
  primary: "text-primary",
  onPrimary: "text-on-primary",
  income: "text-income",
  expense: "text-expense",
  warning: "text-warning",
} as const;

export type TextVariant = keyof typeof variantClasses;
export type TextTone = keyof typeof toneClasses;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  /** Rakamları eşit genişlikte gösterir; para tutarlarının alt alta hizalanması için. */
  numeric?: boolean;
  className?: string;
};

/**
 * Uygulamadaki tüm metinler bu bileşenden geçer.
 * - Yazı boyutu sistem ayarına göre ölçeklenir (allowFontScaling varsayılan olarak açık).
 * - display ve title varyantları ekran okuyucuya "başlık" olarak bildirilir.
 */
export function Text({
  variant = "body",
  tone = "default",
  numeric = false,
  className,
  style,
  accessibilityRole,
  ...rest
}: TextProps) {
  const isHeading = variant === "display" || variant === "title";

  return (
    <RNText
      accessibilityRole={
        accessibilityRole ?? (isHeading ? "header" : undefined)
      }
      className={cn(variantClasses[variant], toneClasses[tone], className)}
      style={numeric ? [{ fontVariant: ["tabular-nums"] }, style] : style}
      {...rest}
    />
  );
}
