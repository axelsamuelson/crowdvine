import { Home, Search, Bell } from "lucide-react"
import { ThemeToggleMobile } from "./theme-toggle-mobile"

function GrokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M2.205 7.423L11.745 21h4.241L6.446 7.423H2.205zm4.237 7.541L2.2 21h4.243l2.12-3.017-2.121-3.019zm9.353-8.939L11.553 12l2.121 3.018 6.363-9.057h-4.242z" />
    </svg>
  )
}

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-background py-2 md:hidden">
      <button className="flex flex-col items-center gap-1 p-2">
        <Home className="h-6 w-6" />
      </button>
      <button className="flex flex-col items-center gap-1 p-2">
        <Search className="h-6 w-6" />
      </button>
      <button className="flex flex-col items-center gap-1 p-2">
        <GrokIcon className="h-6 w-6" />
      </button>
      <button className="flex flex-col items-center gap-1 p-2">
        <Bell className="h-6 w-6" />
      </button>
      <ThemeToggleMobile />
    </nav>
  )
}
