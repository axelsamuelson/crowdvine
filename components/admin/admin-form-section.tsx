import { cn } from "@/lib/utils";

interface AdminFormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/** Section card matching producer/admin detail pages. */
export function AdminFormSection({
  title,
  description,
  children,
  className,
}: AdminFormSectionProps) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-xl border border-gray-200 border-white/10 bg-white p-6 shadow-sm dark:border-[#1F1F23] dark:bg-[#0F0F12]",
        className,
      )}
    >
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
