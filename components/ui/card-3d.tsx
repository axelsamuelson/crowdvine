"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type MouseEnterContextValue = [
  boolean,
  React.Dispatch<React.SetStateAction<boolean>>,
];

const MouseEnterContext = createContext<MouseEnterContextValue | undefined>(
  undefined,
);

export function useMouseEnter() {
  const ctx = useContext(MouseEnterContext);
  if (!ctx) {
    throw new Error("useMouseEnter must be used within CardContainer");
  }
  return ctx;
}

export function CardContainer({
  children,
  className,
  containerClassName,
  disable3d = false,
}: {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  disable3d?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disable3d || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    containerRef.current.style.setProperty("--rotate-x", `${rotateX}deg`);
    containerRef.current.style.setProperty("--rotate-y", `${rotateY}deg`);
  };

  const handleMouseLeave = () => {
    setIsMouseEntered(false);
    if (!containerRef.current) return;
    containerRef.current.style.setProperty("--rotate-x", "0deg");
    containerRef.current.style.setProperty("--rotate-y", "0deg");
  };

  return (
    <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
      <div
        className={cn("flex items-center justify-center py-4", containerClassName)}
        style={{ perspective: disable3d ? undefined : "1000px" }}
      >
        <div
          ref={containerRef}
          onMouseEnter={() => setIsMouseEntered(true)}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
          className={cn(
            "relative w-full transition-transform duration-200 ease-out",
            className,
          )}
          style={{
            transformStyle: disable3d ? undefined : "preserve-3d",
            transform: disable3d
              ? undefined
              : "rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg))",
          }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("w-full", className)}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

export function CardItem({
  as: Tag = "div",
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  disable3d = false,
  ...props
}: {
  as?: React.ElementType;
  children: ReactNode;
  className?: string;
  translateX?: number | string;
  translateY?: number | string;
  translateZ?: number | string;
  rotateX?: number | string;
  rotateY?: number | string;
  rotateZ?: number | string;
  disable3d?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  const [isMouseEntered] = useMouseEnter();

  useEffect(() => {
    if (!ref.current) return;
    if (disable3d) {
      ref.current.style.transform = "none";
      return;
    }
    if (isMouseEntered) {
      ref.current.style.transform = `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
    } else {
      ref.current.style.transform =
        "translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
    }
  }, [
    isMouseEntered,
    translateX,
    translateY,
    translateZ,
    rotateX,
    rotateY,
    rotateZ,
    disable3d,
  ]);

  return (
    <Tag ref={ref} className={cn("w-full", className)} {...props}>
      {children}
    </Tag>
  );
}
