import { cn } from "@/lib/utils";
import { MembershipLevel } from "@/lib/membership/points-engine";

interface LevelBadgeProps {
  level: MembershipLevel;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  className?: string;
}

const levelConfig = {
  requester: {
    name: "Requester",
    gradient: "from-gray-400 to-gray-600",
    border: "border-gray-400",
    text: "text-gray-700",
    shimmer: false,
  },
  basic: {
    name: "Basic",
    gradient: "from-slate-600 to-slate-800",
    border: "border-slate-600",
    text: "text-white",
    shimmer: false,
  },
  brons: {
    name: "Plus",
    gradient: "from-indigo-700 to-indigo-950",
    border: "border-indigo-700",
    text: "text-white",
    shimmer: true,
  },
  silver: {
    name: "Premium",
    gradient: "from-emerald-700 to-emerald-950",
    border: "border-emerald-700",
    text: "text-white",
    shimmer: true,
  },
  guld: {
    name: "Priority",
    gradient: "from-[#E4CAA0] to-[#c9a86c]",
    border: "border-[#E4CAA0]",
    text: "text-gray-900",
    shimmer: true,
  },
  privilege: {
    name: "Privilege",
    gradient: "from-[#2F0E15] to-[#1a080b]",
    border: "border-[#2F0E15]",
    text: "text-white",
    shimmer: true,
  },
  admin: {
    name: "Admin",
    gradient: "from-black to-gray-900",
    border: "border-[#FFD700]",
    text: "text-white",
    shimmer: true,
  },
};

const sizeClasses = {
  sm: {
    badge: "w-12 h-12",
    text: "text-xs",
    icon: "w-6 h-6",
  },
  md: {
    badge: "w-16 h-16",
    text: "text-sm",
    icon: "w-8 h-8",
  },
  lg: {
    badge: "w-24 h-24",
    text: "text-base",
    icon: "w-12 h-12",
  },
  xl: {
    badge: "w-32 h-32",
    text: "text-lg",
    icon: "w-16 h-16",
  },
};

export function LevelBadge({
  level,
  size = "lg",
  showLabel = true,
  className,
}: LevelBadgeProps) {
  const config = levelConfig[level];
  const sizes = sizeClasses[size];

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Metallic Badge */}
      <div className="relative">
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-bold border-2 bg-gradient-to-br relative overflow-hidden",
            config.gradient,
            config.border,
            config.text,
            sizes.badge,
          )}
        >
          {/* Shimmer Effect for Premium Levels */}
          {config.shimmer && (
            <div className="absolute inset-0 opacity-30">
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"
                style={{
                  animation: "shimmer 3s ease-in-out infinite",
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
          )}

          {/* Level Initial */}
          <span className={cn("relative z-10 font-extrabold", sizes.text)}>
            {config.name[0]}
          </span>
        </div>

        {/* Outer glow for premium levels */}
        {config.shimmer && (
          <div
            className={cn(
              "absolute inset-0 rounded-full blur-xl opacity-20 -z-10",
              config.gradient,
            )}
          />
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">{config.name}</p>
          <p className="text-xs text-gray-500">Member</p>
        </div>
      )}

      {/* Shimmer Animation Styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}
