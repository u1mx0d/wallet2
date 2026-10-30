import { View } from "react-native";

import { Text, type TextTone } from "@/components/ui";
import { cn } from "@/lib/cn";

export type ValueRowProps = {
  label: string;
  value: string;
  /** Değerin altında küçük yazıyla gösterilen ek bilgi (ör. yüzde). */
  detail?: string;
  tone?: TextTone;
  emphasize?: boolean;
};

/**
 * Etiket-değer satırı. Büyük yazı boyutlarında taşmaz:
 * - Etiket kalan alanı kullanır ve gerekirse alt satıra geçer.
 * - Değer satırın en fazla %60'ını kaplar; sığmazsa kendi içinde alt satıra geçer.
 * - Ek bilgi (yüzde) değerin altında ayrı satırda durur.
 * Ekran okuyucu satırı tek cümle olarak okur.
 */
export function ValueRow({
  label,
  value,
  detail,
  tone,
  emphasize = false,
}: ValueRowProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${detail ? `, ${detail}` : ""}`}
      className="flex-row items-start justify-between gap-3"
    >
      <Text tone="muted" className="flex-1">
        {label}
      </Text>
      <View className="max-w-[60%] shrink items-end">
        <Text
          numeric
          tone={tone}
          className={cn("text-right", emphasize && "font-semibold")}
        >
          {value}
        </Text>
        {detail ? (
          <Text variant="caption" numeric tone={tone} className="text-right">
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
