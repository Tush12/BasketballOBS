"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

function subscribeToTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("obs-theme-change", onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("obs-theme-change", onChange);
  };
}

function getStoredTheme(): Theme {
  return localStorage.getItem("obs-theme") === "light" ? "light" : "dark";
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getStoredTheme,
    (): Theme => "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function setTheme(nextTheme: Theme) {
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("obs-theme", nextTheme);
    window.dispatchEvent(new Event("obs-theme-change"));
  }

  function toggleTheme() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}