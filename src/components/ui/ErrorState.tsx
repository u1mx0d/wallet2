import { View } from "react-native";

import { cn } from "@/lib/cn";

import { Button } from "./Button";
import { Text } from "./Text";

export type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Yeniden deneme sürerken butonda yükleniyor göstergesi. */
  retrying?: boolean;
  className?: string;
};

export function ErrorState({
  title = "Bir şeyler ters gitti",
  description = "Lütfen bağlantını kontrol edip tekrar dene.",
  onRetry,
  retryLabel = "Tekrar dene",
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <View
      accessibilityRole="alert"
      className={cn("items-center justify-center gap-3 px-6 py-10", className)}
    >
      <Text variant="subtitle" tone="expense" className="text-center">
        {title}
      </Text>
      <Text tone="muted" className="text-center">
        {description}
      </Text>
      {onRetry ? (
        <Button
          title={retryLabel}
          variant="secondary"
          onPress={onRetry}
          loading={retrying}
          className="mt-2"
        />
      ) : null}
    </View>
  );
}
