import { Home, Search, Bell, Mail, Users, Bookmark, FileText, User, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "./theme-toggle"

const navItems = [
  { icon: Home, label: "Home" },
  { icon: Search, label: "Explore" },
  { icon: Bell, label: "Notifications" },
  { icon: Mail, label: "Messages" },
  { icon: GrokIcon, label: "Grok", isCustom: true },
  { icon: XPremiumIcon, label: "Premium", isCustom: true },
  { icon: FileText, label: "Lists" },
  { icon: Bookmark, label: "Bookmarks" },
  { icon: Users, label: "Communities" },
  { icon: User, label: "Profile" },
  { icon: MoreHorizontal, label: "More" },
]

function GrokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M2.205 7.423L11.745 21h4.241L6.446 7.423H2.205zm4.237 7.541L2.2 21h4.243l2.12-3.017-2.121-3.019zm9.353-8.939L11.553 12l2.121 3.018 6.363-9.057h-4.242z" />
    </svg>
  )
}

function XPremiumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 22" className={className}>
      <path
        fill="#1d9bf0"
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.018 1.276-.215 1.817-.569s.972-.853 1.245-1.439c.607.22 1.264.268 1.897.136.634-.13 1.218-.435 1.688-.878.443-.47.747-1.054.877-1.688.131-.633.08-1.29-.144-1.896.587-.273 1.087-.704 1.443-1.245.356-.54.555-1.17.574-1.817z"
      />
      <path fill="#fff" d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246-5.683 6.206z" />
    </svg>
  )
}

export function LeftSidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[68px] flex-col justify-between px-2 py-2 xl:w-[275px] xl:px-3">
      <div className="flex flex-col">
        <div className="p-3">
          <XLogo className="h-7 w-7" />
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href="#"
              className="flex items-center justify-center gap-5 rounded-full p-3 text-xl transition-colors hover:bg-muted xl:justify-start"
            >
              {item.isCustom ? <item.icon className="h-7 w-7" /> : <item.icon className="h-7 w-7" strokeWidth={2} />}
              <span className="hidden xl:inline">{item.label}</span>
            </a>
          ))}
          <ThemeToggle />
        </nav>

        <Button className="mt-4 hidden h-[52px] rounded-full bg-[#1d9bf0] text-lg font-bold text-white hover:bg-[#1a8cd8] xl:block">
          Post
        </Button>
        <Button className="mt-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#1d9bf0] p-0 text-lg font-bold text-white hover:bg-[#1a8cd8] xl:hidden">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
            <path d="M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6 17.331 6 22h2c0-1.007.07-2.012.19-3H12c4.1 0 7.48-3.082 7.94-7.054C22.79 10.147 23.17 6.359 23 3zm-7 8h-1.5v2H16c.63-.016 1.2-.08 1.72-.188C16.95 15.24 14.68 17 12 17H8.55c.57-2.512 1.57-4.851 3-6.78 2.16-2.912 5.29-4.911 9.45-5.187C20.95 8.079 19.9 11 16 11zM4 9V6H1V4h3V1h2v3h3v2H6v3H4z" />
          </svg>
        </Button>
      </div>

      <div className="mb-3 hidden items-center justify-between rounded-full p-3 transition-colors hover:bg-muted xl:flex">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="/jessin-profile.png" className="object-cover" />
            <AvatarFallback>JS</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="flex items-center gap-1 text-[15px] font-bold">
              Jessin Sam S
              <VerifiedBadge className="h-[18px] w-[18px]" />
            </span>
            <span className="text-[15px] text-muted-foreground">@jessinvibe</span>
          </div>
        </div>
        <MoreHorizontal className="h-5 w-5" />
      </div>
      <div className="mb-3 flex items-center justify-center rounded-full p-3 transition-colors hover:bg-muted xl:hidden">
        <Avatar className="h-10 w-10">
          <AvatarImage src="/jessin-profile.png" className="object-cover" />
          <AvatarFallback>JS</AvatarFallback>
        </Avatar>
      </div>
    </aside>
  )
}
