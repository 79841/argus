export const SUPPORTED_LOCALES = ["en", "ko"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
};

export function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

export function getDocUrl(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return `/docs/${locale}/${slug}`;
}

export function getOtherLocale(locale: Locale): Locale {
  return locale === "en" ? "ko" : "en";
}

export type DocMeta = {
  slug: string;
  title: string;
  description?: string;
  order: number;
  group: string;
};

export type SidebarItem = {
  label: string;
  items: DocMeta[];
};
