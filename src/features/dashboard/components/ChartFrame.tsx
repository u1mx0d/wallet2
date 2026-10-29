import { useState, type ReactNode } from "react";
import { View } from "react-native";

export type ChartFrameProps = {
  height: number;
  /** Ekran okuyucunun grafik yerine okuyacağı özet. */
  accessibilityLabel: string;
  /** Ölçülen genişlikle grafiği çizer. */
  children: (width: number) => ReactNode;
};

/**
 * Grafiğin kullanabileceği genişliği ölçer. Grafiği ekran okuyucu için tek bir öğe
 * olarak gruplar; içindeki SVG parçaları tek tek okunmaz.
 */
export function ChartFrame({
  height,
  accessibilityLabel,
  children,
}: ChartFrameProps) {
  const [width, setWidth] = useState(0);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ minHeight: height }}
      onLayout={(event) => setWidth(Math.floor(event.nativeEvent.layout.width))}
    >
      {width > 0 ? children(width) : null}
    </View>
  );
}
