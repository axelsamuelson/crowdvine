import { Footer } from "./footer";

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
    <div className={`${noPadding ? '' : 'pt-top-spacing'} ${className || ''}`}>
      {children}
      <Footer />
    </div>
  );
};
