import {
  ArrowLeft,
  Search,
  Calendar,
  LinkIcon,
  MoreHorizontal,
  MessageCircle,
  Repeat2,
  Heart,
  BarChart2,
  Share,
  Bookmark,
  Pin,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 22" className={className} aria-label="Verified account">
      <g>
        <path
          fill="#1d9bf0"
          d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.164-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z"
        />
        <path fill="#fff" d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246-5.683 6.206z" />
      </g>
    </svg>
  )
}

function GrokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M2.205 7.423L11.745 21h4.241L6.446 7.423H2.205zm4.237 7.541L2.2 21h4.243l2.12-3.017-2.121-3.019zm9.353-8.939L11.553 12l2.121 3.018 6.363-9.057h-4.242z" />
    </svg>
  )
}

function ProfileTabs() {
  const tabs = ["Posts", "Replies", "Highlights", "Articles", "Media", "Likes"]

  return (
    <div className="mt-1 border-b border-border">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            className={`relative flex-1 whitespace-nowrap px-4 py-4 text-[15px] font-medium transition-colors hover:bg-muted/50 min-w-fit ${
              index === 0 ? "font-bold text-foreground" : "text-muted-foreground"
            }`}
          >
            <span className="relative inline-block">
              {tab}
              {index === 0 && <span className="absolute -bottom-4 left-0 right-0 h-1 rounded-full bg-[#1d9bf0]" />}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ProfileMain() {
  return (
    <main className="min-h-screen w-full border-x border-border pb-16 md:w-[600px] md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-4 bg-background/80 px-4 py-1 backdrop-blur-md sm:gap-6">
        <button className="rounded-full p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <span className="flex items-center gap-1 text-xl font-bold">
            Jessin Sam S
            <VerifiedBadge className="h-5 w-5" />
          </span>
          <span className="text-[13px] text-muted-foreground">1,574 posts</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="rounded-full p-2 hover:bg-muted">
            <GrokIcon className="h-5 w-5" />
          </button>
          <button className="rounded-full p-2 hover:bg-muted">
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Banner */}
      <div className="h-[120px] w-full overflow-hidden sm:h-[200px]">
        <img src="/banner-1ui.png" alt="1UI Banner" className="h-full w-full object-cover object-center" />
      </div>

      {/* Profile Info */}
      <div className="px-4">
        <div className="relative flex justify-between">
          <Avatar className="-mt-[50px] h-[100px] w-[100px] border-4 border-background sm:-mt-[68px] sm:h-[136px] sm:w-[136px]">
            <AvatarImage src="/jessin-profile.png" className="object-cover" />
            <AvatarFallback className="text-2xl sm:text-4xl">JS</AvatarFallback>
          </Avatar>
          <div className="mt-3 flex items-center gap-2">
            <button className="rounded-full border border-border p-2 hover:bg-muted">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
              </svg>
            </button>
            <Button variant="outline" className="rounded-full border-border font-bold bg-transparent">
              Edit profile
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <h1 className="flex items-center gap-1 text-xl font-bold">
            Jessin Sam S
            <VerifiedBadge className="h-5 w-5" />
          </h1>
          <p className="text-[15px] text-muted-foreground">@jessinvibe</p>
        </div>

        <p className="mt-3 text-[15px]">
          <span className="text-[#1d9bf0]">@v0</span> Ambassador | Building{" "}
          <span className="text-[#1d9bf0]">1ui.dev</span>
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 text-[15px] text-muted-foreground">
          <a href="#" className="flex items-center gap-1 text-[#1d9bf0] hover:underline">
            <LinkIcon className="h-[18px] w-[18px]" />
            jess.vc
          </a>
          <span className="flex items-center gap-1">
            <Calendar className="h-[18px] w-[18px]" />
            Joined September 2020
          </span>
        </div>

        <div className="mt-3 flex gap-5 text-[15px]">
          <a href="#" className="hover:underline">
            <span className="font-bold">219</span> <span className="text-muted-foreground">Following</span>
          </a>
          <a href="#" className="hover:underline">
            <span className="font-bold">183</span> <span className="text-muted-foreground">Followers</span>
          </a>
        </div>
      </div>

      <ProfileTabs />

      {/* Pinned Post */}
      <article className="border-b border-border px-4 py-3">
        <div className="mb-1 flex items-center gap-1 text-[13px] text-muted-foreground">
          <Pin className="h-3 w-3" />
          <span>Pinned</span>
        </div>
        <div className="flex gap-3">
          <Avatar className="hidden h-10 w-10 sm:flex">
            <AvatarImage src="/jessin-profile.png" className="object-cover" />
            <AvatarFallback>JS</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-bold">Jessin Sam S</span>
              <VerifiedBadge className="h-[18px] w-[18px]" />
              <span className="text-muted-foreground">@jessinvibe · Nov 15</span>
              <div className="ml-auto flex items-center gap-2">
                <button className="rounded-full p-1.5 hover:bg-muted">
                  <GrokIcon className="h-4 w-4 text-muted-foreground" />
                </button>
                <button className="rounded-full p-1.5 hover:bg-muted">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <p className="mt-1 text-[15px]">Excited to join the v0 Ambassador Community! 🎉</p>
            <p className="mt-3 text-[15px]">
              Huge thanks to <span className="text-[#1d9bf0]">@v0</span> and{" "}
              <span className="text-[#1d9bf0]">@ceciaramitaro</span> for this amazing opportunity.
            </p>
            <p className="mt-3 text-[15px]">
              Looking forward to creating, sharing, and collaborating to help grow this platform.
            </p>
            <p className="mt-3 text-[15px]">Let's build something great together! 💪</p>
            <p className="mt-3 text-[15px]">Join Now:</p>
            <button className="text-[15px] text-[#1d9bf0] hover:underline">Show more</button>

            {/* Embedded Card */}
            <div className="mt-3 overflow-hidden rounded-2xl border border-border">
              <img
                src="/v0-ambassador-post.png"
                alt="Congratulations! Welcome to the v0 Ambassador Community!"
                className="w-full"
              />
            </div>

            {/* Post Actions */}
            <div className="mt-3 flex justify-between text-muted-foreground">
              <button className="group flex items-center gap-2 hover:text-[#1d9bf0]">
                <div className="rounded-full p-2 group-hover:bg-[#1d9bf0]/10">
                  <MessageCircle className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[13px]">12</span>
              </button>
              <button className="group flex items-center gap-2 hover:text-green-500">
                <div className="rounded-full p-2 group-hover:bg-green-500/10">
                  <Repeat2 className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[13px]">8</span>
              </button>
              <button className="group flex items-center gap-2 hover:text-pink-600">
                <div className="rounded-full p-2 group-hover:bg-pink-600/10">
                  <Heart className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[13px]">156</span>
              </button>
              <button className="group flex items-center gap-2 hover:text-[#1d9bf0]">
                <div className="rounded-full p-2 group-hover:bg-[#1d9bf0]/10">
                  <BarChart2 className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[13px]">2.4K</span>
              </button>
              <div className="flex items-center gap-1">
                <button className="group rounded-full p-2 hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0]">
                  <Bookmark className="h-[18px] w-[18px]" />
                </button>
                <button className="group rounded-full p-2 hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0]">
                  <Share className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </main>
  )
}
