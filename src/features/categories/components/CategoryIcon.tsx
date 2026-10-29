import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { View } from "react-native";

import type { CategoryIconKey } from "../constants";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

/** Kategori ikon anahtarı → MaterialCommunityIcons adı. Ad yanlışsa TypeScript hata verir. */
const ICON_NAMES: Record<CategoryIconKey, IconName> = {
  cart: "cart",
  utensils: "silverware-fork-knife",
  bus: "bus",
  receipt: "receipt",
  home: "home",
  heart: "heart",
  film: "filmstrip",
  shirt: "tshirt-crew",
  book: "book-open-variant",
  dots: "dots-horizontal",
  briefcase: "briefcase",
  sparkles: "creation",
  gift: "gift",
  car: "car",
  plane: "airplane",
  phone: "cellphone",
  coffee: "coffee",
  paw: "paw",
  baby: "baby-carriage",
  dumbbell: "dumbbell",
  tool: "wrench",
  chart: "chart-line",
  coins: "cash",
};

const FALLBACK_ICON: IconName = "shape";
const FALLBACK_COLOR = "#64748B";
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function categoryIconName(key: string): IconName {
  return (
    (ICON_NAMES as Record<string, IconName | undefined>)[key] ?? FALLBACK_ICON
  );
}

const SIZES = {
  sm: { box: 28, glyph: 16 },
  md: { box: 40, glyph: 22 },
} as const;

export type CategoryIconProps = {
  icon: string;
  color: string;
  size?: keyof typeof SIZES;
};

/** Dekoratif: ekran okuyucudan gizlidir; kategori adı her zaman yanında metin olarak yazar. */
export function CategoryIcon({ icon, color, size = "md" }: CategoryIconProps) {
  const safeColor = HEX_COLOR.test(color) ? color : FALLBACK_COLOR;
  const { box, glyph } = SIZES[size];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: box,
        height: box,
        borderRadius: box / 2,
        // %15 opaklıkta zemin: "#RRGGBB" + "26"
        backgroundColor: `${safeColor}26`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons
        name={categoryIconName(icon)}
        size={glyph}
        color={safeColor}
      />
    </View>
  );
}
