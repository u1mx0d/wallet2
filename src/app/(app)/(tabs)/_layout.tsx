import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";

import { useTheme } from "@/theme/ThemeProvider";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

/**
 * İkon rengi sekme çubuğunun verdiği renkten değil, tema token'larından seçilir.
 * (Kütüphanenin ColorValue tipi null ve number içerebiliyor; ikon bileşeni bunları kabul etmiyor.)
 */
function TabIcon({
  name,
  focused,
  size,
}: {
  name: IconName;
  focused: boolean;
  size: number;
}) {
  const { colors } = useTheme();
  return (
    <MaterialCommunityIcons
      name={name}
      color={focused ? colors.primary : colors.muted}
      size={size}
    />
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { color: colors.foreground },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ana sayfa",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon
              name="view-dashboard-outline"
              focused={focused}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Tüm işlemler",
          // Ekranın kendi başlığı "Tüm işlemler"; sekme etiketi kısa kalsın.
          tabBarLabel: "İşlemler",
          headerShown: true,
          tabBarIcon: ({ focused, size }) => (
            <TabIcon
              name="format-list-bulleted"
              focused={focused}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: "Yatırımlar",
          headerShown: true,
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name="chart-pie" focused={focused} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
