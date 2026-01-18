"use client"

import { useState } from "react"

export default function Page() {
  const [items] = useState(() =>
    Array.from({ length: 40 }, (_, i) => {
      const colors = [
        "#ffffff", // white
        "#525252", // gray
        "#3b82f6", // blue
        "#8b5cf6", // purple
        "#ec4899", // pink
        "#ef4444", // red
        "#f59e0b", // amber
        "#10b981", // green
        "#06b6d4", // cyan
      ]
      return {
        id: i,
        height: Math.floor(Math.random() * 400) + 100,
        color: colors[Math.floor(Math.random() * colors.length)],
      }
    }),
  )

  return (
    <main className="min-h-screen bg-background p-6 lg:p-12">
      <div className="max-w-7xl mx-auto mb-12">
        <h1 className="text-5xl font-bold mb-3 text-foreground text-balance">Masonry Grid</h1>
        <p className="text-muted-foreground text-lg">A dynamic layout system with balanced distribution.</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 auto-rows-[20px]">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-border overflow-hidden hover:border-foreground/20 transition-all duration-200 group"
            style={{
              backgroundColor: item.color,
              gridRowEnd: `span ${Math.ceil(item.height / 20)}`,
            }}
          >
            <div className="p-6 h-full flex items-start justify-start">
              <span
                className={`text-sm font-mono font-medium ${
                  item.color === "#ffffff" ? "text-black" : "text-white"
                } opacity-60 group-hover:opacity-100 transition-opacity duration-200`}
              >
                {String(item.id + 1).padStart(2, "0")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
