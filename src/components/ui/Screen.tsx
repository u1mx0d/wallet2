import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { cn } from "@/lib/cn";

export type ScreenProps = {
  children: ReactNode;
  /** true ise içerik kaydırılabilir. Formlar ve uzun içerikler için. */
  scroll?: boolean;
  /** Güvenli alan boşluğu uygulanacak kenarlar. Header'lı ekranlarda ["bottom"] kullan. */
  edges?: Edge[];
  className?: string;
  contentClassName?: string;
};

/**
 * Tüm ekranların kök bileşeni: güvenli alan (çentik, alt çubuk),
 * tema arka planı ve klavye açıldığında içeriğin kaymasını yönetir.
 */
export function Screen({
  children,
  scroll = false,
  edges = ["top", "bottom"],
  className,
  contentClassName,
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={cn("gap-4 p-5", contentClassName)}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn("flex-1 gap-4 p-5", contentClassName)}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={edges}
      className={cn("flex-1 bg-background", className)}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
