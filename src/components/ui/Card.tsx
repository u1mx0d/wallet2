import { View, type ViewProps } from "react-native";

import { cn } from "@/lib/cn";

export type CardProps = ViewProps & {
  className?: string;
};

export function Card({ className, ...rest }: CardProps) {
  return (
    <View
      className={cn(
        "gap-3 rounded-2xl border border-border bg-surface p-4",
        className,
      )}
      {...rest}
    />
  );
}
