import { Search, MoreHorizontal, ChevronUp } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 22" className={className}>
      <path
        fill="#1d9bf0"
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
      />
    </svg>
  )
}

function GoldBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 22" className={className}>
      <path
        fill="#e2b719"
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.165-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
      />
    </svg>
  )
}

function AffiliateBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 22" className={className}>
      <path
        fill="#829aab"
        d="M15.414 6.586a2 2 0 0 0-2.828 0L7.758 11.414a2 2 0 1 0 2.828 2.828l.707-.707-2.828-2.828 3.535-3.535a2 2 0 0 1 2.828 2.828l-.707.707 2.829 2.829.707-.707a2 2 0 0 0 0-2.829z"
      />
    </svg>
  )
}

const suggestedUsers = [
  {
    name: "Jared Palmer",
    username: "@jaredpalmer",
    avatar: "/tech-developer-man-portrait.jpg",
    verified: true,
  },
  {
    name: "Mo",
    username: "@Kerroudjm",
    avatar: "/young-developer-portrait.png",
    verified: true,
  },
  {
    name: "Next.js",
    username: "@nextjs",
    avatar: "/next-js-logo-black-n.jpg",
    verified: true,
    isGold: true,
    isAffiliate: true,
  },
]

const trendingTopics = [
  {
    category: "Trending in United Arab Emirates",
    topic: "#الذهب",
    posts: null,
  },
  {
    category: "Politics · Trending",
    topic: "श्री राम",
    posts: "276K posts",
  },
  {
    category: "Technology · Trending",
    topic: "Grok",
    posts: "797K posts",
  },
]

export function RightSidebar() {
  return (
    <aside className="sticky top-0 ml-6 h-screen w-[350px] py-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search"
          className="h-[42px] rounded-full border-none bg-muted pl-12 focus-visible:ring-1 focus-visible:ring-[#1d9bf0]"
        />
      </div>

      {/* You might like */}
      <div className="mt-4 rounded-2xl bg-muted">
        <h2 className="px-4 py-3 text-xl font-bold">You might like</h2>
        {suggestedUsers.map((user) => (
          <div
            key={user.username}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted-foreground/10"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar || "/placeholder.svg"} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="flex items-center gap-0.5 font-bold leading-5">
                  {user.name}
                  {user.isGold ? (
                    <GoldBadge className="h-[18px] w-[18px]" />
                  ) : user.verified ? (
                    <VerifiedBadge className="h-[18px] w-[18px]" />
                  ) : null}
                  {user.isAffiliate && <AffiliateBadge className="h-[18px] w-[18px]" />}
                </span>
                <span className="text-[15px] leading-5 text-muted-foreground">{user.username}</span>
              </div>
            </div>
            <Button className="h-8 rounded-full bg-foreground px-4 font-bold text-background hover:bg-foreground/90">
              Follow
            </Button>
          </div>
        ))}
        <button className="w-full px-4 py-3 text-left text-[15px] text-[#1d9bf0] hover:bg-muted-foreground/10">
          Show more
        </button>
      </div>

      {/* What's happening */}
      <div className="mt-4 rounded-2xl bg-muted">
        <h2 className="px-4 py-3 text-xl font-bold">What's happening</h2>
        {trendingTopics.map((topic, index) => (
          <div
            key={index}
            className="flex items-start justify-between px-4 py-3 transition-colors hover:bg-muted-foreground/10"
          >
            <div className="flex flex-col">
              <span className="text-[13px] text-muted-foreground">{topic.category}</span>
              <span className="font-bold">{topic.topic}</span>
              {topic.posts && <span className="text-[13px] text-muted-foreground">{topic.posts}</span>}
            </div>
            <button className="rounded-full p-1.5 hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0]">
              <MoreHorizontal className="h-[18px] w-[18px] text-muted-foreground" />
            </button>
          </div>
        ))}
        <button className="w-full px-4 py-3 text-left text-[15px] text-[#1d9bf0] hover:bg-muted-foreground/10">
          Show more
        </button>
      </div>

      {/* Footer */}
      <nav className="mt-4 flex flex-wrap gap-x-3 gap-y-1 px-4 text-[13px] text-muted-foreground">
        <a href="#" className="hover:underline">
          Terms of Service
        </a>
        <a href="#" className="hover:underline">
          Privacy Policy
        </a>
        <a href="#" className="hover:underline">
          Cookie Policy
        </a>
        <a href="#" className="hover:underline">
          Accessibility
        </a>
        <a href="#" className="hover:underline">
          Ads info
        </a>
        <a href="#" className="hover:underline">
          More ...
        </a>
        <span>© 2025 X Corp.</span>
      </nav>

      {/* Messages */}
      <div className="fixed bottom-0 right-4 hidden w-[350px] xl:block">
        <div className="flex items-center justify-between rounded-t-2xl bg-background px-4 py-3 shadow-lg">
          <h3 className="font-bold">Messages</h3>
          <div className="flex items-center gap-2">
            <button className="rounded-full p-1 hover:bg-muted">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z" />
              </svg>
            </button>
            <button className="rounded-full p-1 hover:bg-muted">
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grok FAB */}
      <button className="fixed bottom-20 right-8 hidden rounded-full bg-background p-4 shadow-lg hover:bg-muted xl:block">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          <path d="M2.205 7.423L11.745 21h4.241L6.446 7.423H2.205zm4.237 7.541L2.2 21h4.243l2.12-3.017-2.121-3.019zm9.353-8.939L11.553 12l2.121 3.018 6.363-9.057h-4.242z" />
        </svg>
      </button>
    </aside>
  )
}
