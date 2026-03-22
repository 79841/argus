import fs from "fs";
import path from "path";
import matter from "gray-matter";

const DOCS_DIR = path.join(process.cwd(), "content/docs");

export const SUPPORTED_LOCALES = ["en", "ko"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export type DocMeta = {
  slug: string;
  title: string;
  description?: string;
  order: number;
  group: string;
};

export type Doc = DocMeta & {
  content: string;
};

type SidebarItem = {
  label: string;
  items: DocMeta[];
};

const DOC_CONFIG: Record<string, { group: string; order: number }> = {
  "getting-started": { group: "Getting Started", order: 0 },
  installation: { group: "Getting Started", order: 1 },
  "setup-guide": { group: "Getting Started", order: 2 },
  "user-guide": { group: "Dashboard", order: 3 },
  pages: { group: "Dashboard", order: 4 },
  "api-reference": { group: "Reference", order: 5 },
  architecture: { group: "Reference", order: 6 },
};

const GROUP_ORDER = ["Getting Started", "Dashboard", "Reference"];

function getDocsDir(locale: Locale): string {
  return path.join(DOCS_DIR, locale);
}

export function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

export function getAllDocs(locale: Locale = DEFAULT_LOCALE): DocMeta[] {
  const dir = getDocsDir(locale);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));

  return files
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data } = matter(raw);
      const config = DOC_CONFIG[slug] ?? { group: "Other", order: 99 };

      return {
        slug,
        title: (data.title as string) ?? slug,
        description: data.description as string | undefined,
        order: config.order,
        group: config.group,
      };
    })
    .sort((a, b) => a.order - b.order);
}

export function getDoc(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
): Doc | null {
  const filePath = path.join(getDocsDir(locale), `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const config = DOC_CONFIG[slug] ?? { group: "Other", order: 99 };

  return {
    slug,
    title: (data.title as string) ?? slug,
    description: data.description as string | undefined,
    order: config.order,
    group: config.group,
    content,
  };
}

export function getSidebar(locale: Locale = DEFAULT_LOCALE): SidebarItem[] {
  const docs = getAllDocs(locale);
  const groups = new Map<string, DocMeta[]>();

  for (const doc of docs) {
    const list = groups.get(doc.group) ?? [];
    list.push(doc);
    groups.set(doc.group, list);
  }

  return GROUP_ORDER.filter((g) => groups.has(g)).map((label) => ({
    label,
    items: groups.get(label)!,
  }));
}

export function getAdjacentDocs(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
): {
  prev: DocMeta | null;
  next: DocMeta | null;
} {
  const docs = getAllDocs(locale);
  const idx = docs.findIndex((d) => d.slug === slug);

  return {
    prev: idx > 0 ? docs[idx - 1] : null,
    next: idx < docs.length - 1 ? docs[idx + 1] : null,
  };
}
