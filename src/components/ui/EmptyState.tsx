import { View } from "react-native";

import { cn } from "@/lib/cn";

import { Button } from "./Button";
import { Text } from "./Text";

export type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <View
      className={cn("items-center justify-center gap-3 px-6 py-10", className)}
    >
      <Text variant="subtitle" className="text-center">
        {title}
      </Text>
      {description ? (
        <Text tone="muted" className="text-center">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} className="mt-2" />
      ) : null}
    </View>
  );
}
