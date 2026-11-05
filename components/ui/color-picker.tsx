import * as React from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect } from "react";

export interface Color {
  name: string;
  value: string;
}

interface ColorSwatchProps {
  color: Color | [Color, Color];
  isSelected: boolean;
  onColorChange: (color: Color | [Color, Color]) => void;
  size?: "xs" | "sm" | "md" | "lg";
  atLeastOneColorSelected: boolean;
  /** Override visible/tooltip label (e.g. localized wine color names). */
  displayName?: string;
  selectColorAria?: (name: string) => string;
  /** Clean category URL when shop filter navigation applies. */
  href?: string | null;
  /** Show a small text label under the swatch (mobile PLP filter sheet). */
  showLabel?: boolean;
  /** Query-mode facet: present in the catalog, zero hits in the current list. */
  disabled?: boolean;
  /** Short caption under the swatch, e.g. "(0)". */
  annotation?: string;
}

export const sizeClasses = {
  xs: "size-5",
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
};

export function ColorSwatch({
  color,
  isSelected,
  onColorChange,
  size = "md",
  atLeastOneColorSelected,
  displayName: displayNameProp,
  selectColorAria,
  href,
  showLabel = false,
  disabled = false,
  annotation,
}: ColorSwatchProps) {
  const isDualColor = Array.isArray(color);
  const displayName =
    displayNameProp ??
    (isDualColor ? `${color[0].name} & ${color[1].name}` : color.name);
  const ariaLabel = selectColorAria
    ? selectColorAria(displayName)
    : `Select color: ${displayName}`;

  const className = cn(
    "rounded-full ring ring-accent cursor-pointer transition-[outline,box-shadow,opacity] relative overflow-hidden inline-block",
    sizeClasses[size],
    size === "xs" && "ring-[1px]",
    isSelected
      ? "ring-2 opacity-100 ring-primary/80"
      : atLeastOneColorSelected
        ? "opacity-40 hover:ring-primary/30 hover:opacity-70"
        : "opacity-100",
  );

  const swatchBody = isDualColor ? (
    <>
      <div
        className="absolute top-0 left-0 w-1/2 h-full"
        style={{ backgroundColor: color[0].value }}
      />
      <div
        className="absolute top-0 right-0 w-1/2 h-full"
        style={{ backgroundColor: color[1].value }}
      />
    </>
  ) : (
    <div className="w-full h-full" style={{ backgroundColor: color.value }} />
  );

  const swatchClassName = disabled
    ? cn(
        className,
        "cursor-not-allowed opacity-40 hover:opacity-40 hover:ring-accent",
      )
    : className;

  const control =
    href && !disabled ? (
      <a
        href={href}
        className={className}
        title={displayName}
        onClick={(event) => {
          event.preventDefault();
          onColorChange(color);
        }}
        aria-pressed={isSelected}
        aria-label={ariaLabel}
      >
        {swatchBody}
        {!showLabel ? <span className="sr-only">{displayName}</span> : null}
      </a>
    ) : (
      <button
        type="button"
        className={swatchClassName}
        title={displayName}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          onColorChange(color);
        }}
        aria-pressed={isSelected}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
      >
        {swatchBody}
        {!showLabel ? <span className="sr-only">{displayName}</span> : null}
      </button>
    );

  if (!showLabel && !annotation) return control;

  return (
    <span className="inline-flex flex-col items-center gap-1">
      {control}
      {showLabel ? (
        <span
          className="max-w-[3.25rem] truncate text-center text-[10px] font-medium leading-tight text-foreground/70"
          aria-hidden
        >
          {displayName}
        </span>
      ) : null}
      {annotation ? (
        <span
          className="text-center text-[10px] font-medium leading-tight text-foreground/45"
          aria-hidden
        >
          {annotation}
        </span>
      ) : null}
    </span>
  );
}

interface ColorPickerProps {
  colors: (Color | [Color, Color])[];
  selectedColors: (Color | [Color, Color])[];
  onColorChange: (color: Color | [Color, Color]) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  formatDisplayName?: (color: Color | [Color, Color]) => string;
  selectColorAria?: (name: string) => string;
  getColorHref?: (color: Color | [Color, Color]) => string | null;
  /** Mobile filter sheet: labels under each swatch. Desktop leaves unset. */
  showLabels?: boolean;
  /** Query-mode only. Navigation mode leaves this unset. */
  getColorState?: (
    color: Color | [Color, Color],
  ) => { disabled?: boolean; annotation?: string } | undefined;
}

export function ColorPicker({
  colors,
  selectedColors,
  onColorChange,
  size = "md",
  className,
  formatDisplayName,
  selectColorAria,
  getColorHref,
  showLabels = false,
  getColorState,
}: ColorPickerProps) {
  const [isClient, setIsClient] = useState(false);
  const atLeastOneColor = selectedColors.length > 0;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isColorSelected = (color: Color | [Color, Color]) => {
    return selectedColors.some((selectedColor) => {
      if (Array.isArray(color) && Array.isArray(selectedColor)) {
        return (
          color[0].value === selectedColor[0].value &&
          color[1].value === selectedColor[1].value
        );
      } else if (!Array.isArray(color) && !Array.isArray(selectedColor)) {
        return color.value === selectedColor.value;
      }
      return false;
    });
  };

  const ColorWrapper = isClient ? motion.div : "div";

  const renderSwatch = (color: Color | [Color, Color]) => {
    const state = getColorState?.(color);
    return (
      <ColorSwatch
        color={color}
        isSelected={isColorSelected(color)}
        onColorChange={onColorChange}
        size={size}
        atLeastOneColorSelected={atLeastOneColor}
        displayName={formatDisplayName?.(color)}
        selectColorAria={selectColorAria}
        href={getColorHref?.(color)}
        showLabel={showLabels}
        disabled={state?.disabled}
        annotation={state?.annotation}
      />
    );
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5",
        showLabels && "gap-x-2.5 gap-y-2",
        className,
      )}
    >
      {isClient ? (
        <AnimatePresence initial={false}>
          {colors.map((color, index) => (
            <ColorWrapper
              key={
                Array.isArray(color)
                  ? `${color[0].value}-${color[1].value}`
                  : color.value
              }
              layout="position"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                duration: 0.2,
                delay: index * 0.05,
                ease: "easeOut",
              }}
              className={
                showLabels || getColorState?.(color)?.annotation
                  ? undefined
                  : sizeClasses[size]
              }
            >
              {renderSwatch(color)}
            </ColorWrapper>
          ))}
        </AnimatePresence>
      ) : (
        colors.map((color) => (
          <ColorWrapper
            key={
              Array.isArray(color)
                ? `${color[0].value}-${color[1].value}`
                : color.value
            }
            className={
              showLabels || getColorState?.(color)?.annotation
                ? undefined
                : sizeClasses[size]
            }
          >
            {renderSwatch(color)}
          </ColorWrapper>
        ))
      )}
    </div>
  );
}
