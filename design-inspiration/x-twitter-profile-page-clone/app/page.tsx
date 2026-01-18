import { LeftSidebar } from "@/components/left-sidebar"
import { ProfileMain } from "@/components/profile-main"
import { RightSidebar } from "@/components/right-sidebar"
import { MobileNav } from "@/components/mobile-nav"

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-[1300px]">
        <div className="hidden md:block">
          <LeftSidebar />
        </div>
        <ProfileMain />
        <div className="hidden lg:block">
          <RightSidebar />
        </div>
      </div>
      <MobileNav />
    </div>
  )
}
