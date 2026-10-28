import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/ThemeProvider";

export type SkeletonProps = {
  /** Boyut ve şekil (ör. "h-4 w-32" veya "h-12 w-12 rounded-full"). */
  className?: string;
};

/**
 * Yükleniyor yer tutucusu.
 * - NativeWind animate-* sınıfları KULLANILMAZ (SDK 58'de bileşen kaldırılınca
 *   durmayan animasyon hatası bildirildi). Animasyon Reanimated ile yazıldı ve
 *   bileşen kaldırılınca cancelAnimation ile durdurulur.
 * - className yalnızca dıştaki düz View'a verilir; Animated.View'a NativeWind
 *   sınıfı uygulanmaz (Reanimated 4 ile bilinen uyumsuzluk).
 * - "Hareketi azalt" sistem ayarı açıksa animasyon çalışmaz.
 * - Ekran okuyucudan gizlenir; yükleniyor bilgisini ekranın kendisi vermeli.
 */
export function Skeleton({ className }: SkeletonProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(withTiming(0.4, { duration: 800 }), -1, true);
    return () => {
      cancelAnimation(opacity);
    };
  }, [reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("overflow-hidden rounded-lg", className)}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors["surface-muted"] },
          animatedStyle,
        ]}
      />
    </View>
  );
}
