import * as React from "react";

import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

export const inputVariants = cva(
  "flex w-full rounded-full transition-[background-color,box-shadow] backdrop-blur-sm duration-200 ease-out bg-primary/20 shadow-sm ring-1 ring-transparent focus-visible:bg-primary/20 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-4 focus-visible:ring-offset-black/10 disabled:cursor-not-allowed disabled:opacity-50 md:text-base text-white border-2 border-white/50 h-11 !text-base placeholder:text-white/80 focus:outline-none px-4",
);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-white px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus-visible:!ring-red-500",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
