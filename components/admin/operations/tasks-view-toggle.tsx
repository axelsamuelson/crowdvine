"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { LayoutList, Columns3 } from "lucide-react"

const STORAGE_KEY = "admin-tasks-view-preference"

interface Props {
  onViewChange: (view: "table" | "board") => void
}

export function TasksViewToggle({ onViewChange }: Props) {
  const [view, setView] = useState<"table" | "board">("table")

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === "board" || saved === "table") {
        setView(saved)
        onViewChange(saved)
      }
    } catch {}
  }, [])

  function toggle(next: "table" | "board") {
    setView(next)
    onViewChange(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }

  return (
    <div className="flex items-center rounded-lg border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 px-3 rounded-none border-r border-gray-200 dark:border-[#1F1F23] ${
          view === "table"
            ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white"
            : "text-gray-500 dark:text-gray-400"
        }`}
        onClick={() => toggle("table")}
      >
        <LayoutList className="h-4 w-4 mr-1.5" />
        Table
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 px-3 rounded-none ${
          view === "board"
            ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white"
            : "text-gray-500 dark:text-gray-400"
        }`}
        onClick={() => toggle("board")}
      >
        <Columns3 className="h-4 w-4 mr-1.5" />
        Board
      </Button>
    </div>
  )
}
