import React from "react";

interface MiniProgressProps {
  valuePercent: number | null;
  className?: string;
}

/**
 * Mini progress bar for dropdown pallet rows.
 * 2px height, neutral colors, full width under meta-row.
 */
export function MiniProgress({ valuePercent, className = "" }: MiniProgressProps) {
  const percent = valuePercent !== null ? Math.max(0, Math.min(100, valuePercent)) : 0;
  const display = valuePercent !== null;

  if (!display) return null;
  
  return (
    <div className={`w-full h-0.5 bg-gray-100 rounded-full overflow-hidden ${className}`}>
      <div 
        className="h-full bg-gray-300 transition-all duration-300 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

interface PalletProgressProps {
  valuePercent: number | null;
  variant: 'bar' | 'ring';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface ProgressHaloProps {
  valuePercent: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Pallet progress indicator for pallet page headers.
 * Variant A (bar): 8-10px bar + large number "64% full"
 * Variant B (ring): 48-56px ring with number in middle
 */
export function PalletProgress({ 
  valuePercent, 
  variant, 
  size = 'md',
  className = "" 
}: PalletProgressProps) {
  const percent = valuePercent !== null ? Math.max(0, Math.min(100, valuePercent)) : 0;
  const displayPercent = valuePercent !== null ? `${percent}%` : '—%';
  
  const sizeClasses = {
    sm: {
      bar: 'h-2 w-16',
      ring: 'w-10 h-10',
      text: 'text-sm'
    },
    md: {
      bar: 'h-2.5 w-20', // 8-10px height
      ring: 'w-12 h-12', // 48-56px
      text: 'text-base'
    },
    lg: {
      bar: 'h-3 w-24',
      ring: 'w-14 h-14',
      text: 'text-lg'
    }
  };
  
  if (variant === 'bar') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className={`${sizeClasses[size].bar} bg-gray-200 rounded-full overflow-hidden`}>
          <div 
            className="h-full bg-gray-900 transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className={`${sizeClasses[size].text} font-light text-gray-900`}>
          {displayPercent} full
        </span>
      </div>
    );
  }
  
  if (variant === 'ring') {
    const radius = size === 'sm' ? 18 : size === 'md' ? 20 : 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className={`${sizeClasses[size].ring} relative flex items-center justify-center`}>
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox={`0 0 ${radius * 2 + 4} ${radius * 2 + 4}`}
          >
            {/* Background circle */}
            <circle
              cx={radius + 2}
              cy={radius + 2}
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-gray-200"
            />
            {/* Progress circle */}
            {percent > 0 && (
              <circle
                cx={radius + 2}
                cy={radius + 2}
                r={radius}
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-gray-900 transition-all duration-500 ease-out"
              />
            )}
          </svg>
          <span className={`${sizeClasses[size].text} font-light text-gray-900 z-10`}>
            {displayPercent}
          </span>
        </div>
        <span className={`${sizeClasses[size].text} font-light text-gray-900`}>
          full
        </span>
      </div>
    );
  }
  
  return null;
}

/**
 * Progress halo for header icons
 */
export function ProgressHalo({ 
  valuePercent, 
  size = 'md',
  className = "" 
}: ProgressHaloProps) {
  const percent = valuePercent || 0;
  
  const sizeClasses = {
    sm: {
      container: 'w-6 h-6',
      radius: 12,
      strokeWidth: 1
    },
    md: {
      container: 'w-8 h-8',
      radius: 16,
      strokeWidth: 1.5
    },
    lg: {
      container: 'w-10 h-10',
      radius: 20,
      strokeWidth: 2
    }
  };
  
  const { container, radius, strokeWidth } = sizeClasses[size];
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  
  return (
    <div className={`${container} relative ${className}`}>
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox={`0 0 ${radius * 2 + strokeWidth * 2} ${radius * 2 + strokeWidth * 2}`}
      >
        {/* Progress halo circle */}
        {percent > 0 && (
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-gray-300 opacity-60"
          />
        )}
      </svg>
    </div>
  );
}
