import { cn } from "@/lib/utils";
import {
  MembershipLevel,
  getLevelDisplayName,
  normalizeMembershipLevel,
} from "@/lib/membership/points-engine";
import { MEMBERSHIP_LEVEL_VISUAL_STYLE } from "@/lib/membership/level-visual-style";

interface LevelBadgeProps {
  level: MembershipLevel;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  className?: string;
}

const levelConfig = MEMBERSHIP_LEVEL_VISUAL_STYLE;

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
  const safeLevel = normalizeMembershipLevel(level);
  const config = levelConfig[safeLevel];
  const displayName = getLevelDisplayName(safeLevel);
  const isCssGradient = config.gradient.includes("linear-gradient");
  const isCssBorder =
    config.border.startsWith("#") || config.border.startsWith("rgb");
  const sizes = sizeClasses[size];

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Metallic Badge */}
      <div className="relative">
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-bold border-2 bg-gradient-to-br relative overflow-hidden",
            !isCssGradient ? config.gradient : undefined,
            !isCssBorder ? config.border : undefined,
            config.text,
            sizes.badge,
          )}
          style={{
            ...(isCssGradient ? { backgroundImage: config.gradient } : {}),
            ...(isCssBorder ? { borderColor: config.border } : {}),
          }}
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
            {config.letter ?? displayName[0]}
          </span>
        </div>

        {/* Outer glow for premium levels */}
        {config.shimmer && (
          <div
            className={cn(
              "absolute inset-0 rounded-full blur-xl opacity-20 -z-10",
              !isCssGradient ? config.gradient : undefined,
            )}
            style={isCssGradient ? { backgroundImage: config.gradient } : undefined}
          />
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">{displayName}</p>
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
