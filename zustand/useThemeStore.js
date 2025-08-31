import AsyncStorage from "@react-native-async-storage/async-storage"; // Add this import
import { create } from "zustand";
import darkTheme from "../themes/dark";
import lightTheme from "../themes/light";

const THEME_KEY = "@theme";

export const useThemeStore = create((set, get) => ({
  theme: "light",
  colors: lightTheme.colors,
  init: async () => {
    const saved = await AsyncStorage.getItem(THEME_KEY);
    if (saved) {
      const { theme } = JSON.parse(saved);
      const newColors = theme === "light" ? lightTheme.colors : darkTheme.colors;
      set({ theme, colors: newColors });
    }
  },
  toggleTheme: async () => {
    const state = get();
    const newTheme = state.theme === "light" ? "dark" : "light";
    const newColors = newTheme === "light" ? lightTheme.colors : darkTheme.colors;
    
    await AsyncStorage.setItem(THEME_KEY, JSON.stringify({ theme: newTheme }));
    
    set({ theme: newTheme, colors: newColors });
  },
}));

useThemeStore.getState().init();