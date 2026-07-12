import type { AppLocale } from "@/lib/i18n/locale";
import type { WineCategoryFaqItem } from "@/lib/wine-category-types";
import { categoryFaqHeading } from "@/lib/wine-category-faq";

interface CategoryFaqSectionProps {
  h1: string;
  locale: AppLocale;
  faq: WineCategoryFaqItem[];
}

export function CategoryFaqSection({ h1, locale, faq }: CategoryFaqSectionProps) {
  if (!faq.length) return null;

  return (
    <section className="mt-12 border-t border-stone-100 pt-12">
      <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-stone-400">
        {categoryFaqHeading(h1, locale)}
      </h2>
      <dl className="max-w-2xl space-y-6">
        {faq.map((item) => (
          <div key={item.question}>
            <dt className="text-sm font-medium text-stone-900">{item.question}</dt>
            <dd className="mt-2 text-sm text-stone-600">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
