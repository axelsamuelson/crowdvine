"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useMapTopoTheme } from "./theme-provider";

export function MapTopoThemeToggle() {
  const { theme, toggle } = useMapTopoTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="w-9 h-9 rounded-md border border-border bg-background"
        aria-label="Toggle theme"
      >
        <span className="sr-only">Toggle theme</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-md border border-border bg-background hover:bg-accent transition-colors flex items-center justify-center"
      aria-label="Toggle theme"
      data-mode={theme}
    >
      {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}

