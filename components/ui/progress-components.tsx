import React from "react";

interface MiniProgressProps {
  valuePercent: number | null;
  className?: string;
}

/**
 * Mini progress bar for dropdown lists
 */
export function MiniProgress({ valuePercent, className = "" }: MiniProgressProps) {
  const percent = valuePercent || 0;
  
  return (
    <div className={`w-full h-0.5 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div 
        className="h-full bg-gray-400 transition-all duration-300 ease-out"
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

/**
 * Pallet progress indicator for pallet pages
 */
export function PalletProgress({ 
  valuePercent, 
  variant, 
  size = 'md',
  className = "" 
}: PalletProgressProps) {
  const percent = valuePercent || 0;
  const displayPercent = valuePercent !== null ? `${percent}%` : '—%';
  
  const sizeClasses = {
    sm: {
      bar: 'h-2 w-16',
      ring: 'w-10 h-10',
      text: 'text-sm'
    },
    md: {
      bar: 'h-2.5 w-20',
      ring: 'w-12 h-12',
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
