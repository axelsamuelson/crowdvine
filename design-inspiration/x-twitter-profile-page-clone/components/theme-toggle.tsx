"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center gap-5 rounded-full p-3 text-xl transition-colors hover:bg-muted xl:justify-start"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun className="h-7 w-7" strokeWidth={2} /> : <Moon className="h-7 w-7" strokeWidth={2} />}
      <span className="hidden xl:inline">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  )
}
