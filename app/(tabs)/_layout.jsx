import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TouchableOpacity } from "react-native";
import { useThemeStore } from "../../zustand/useThemeStore";

export default function TabsLayout() {
  const { colors, toggleTheme, theme } = useThemeStore();

  return (
    <>
      <StatusBar style={theme === "light" ? "dark" : "light"} />

      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.header,
          },
          headerTintColor: colors.text,
          headerTitleAlign: "center",
          tabBarStyle: {
            backgroundColor: colors.tabBar,
          },
          tabBarActiveTintColor: colors.tabIcon,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Articles",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="document-text-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="shorts"
          options={{
            title: "shorts",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="newspaper-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="models"
          options={{
            title: "3D Models",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            headerRight: () => (
              <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 15 }}>
                <Ionicons
                  name={theme === "light" ? "moon-outline" : "sunny-outline"}
                  size={22}
                  color={colors.text}
                />
              </TouchableOpacity>
            ),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
