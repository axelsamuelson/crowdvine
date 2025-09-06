import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

interface ProfileIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ProfileIcon({ className = "", size = "md" }: ProfileIconProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`p-2 hover:bg-background/20 transition-colors ${className}`}
      asChild
    >
      <Link href="/profile" prefetch>
        <User className={sizeClasses[size]} />
        <span className="sr-only">Profile</span>
      </Link>
    </Button>
  );
}
