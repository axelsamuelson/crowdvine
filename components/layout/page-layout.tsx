import { Footer } from "./footer";
import { cn } from "@/lib/utils";

export const PageLayout = ({
  children,
  className,
  noPadding = false,
}: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) => {
  return (
    <>
      <div className={cn(!noPadding && "pt-top-spacing", className)}>
        {children}
      </div>
      <Footer />
    </>
  );
};
