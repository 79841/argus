import fs from "fs";
import path from "path";
import matter from "gray-matter";

export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  isValidLocale,
  getDocUrl,
  getOtherLocale,
} from "./docs-shared";
export type { Locale, DocMeta, SidebarItem } from "./docs-shared";
import type { Locale, DocMeta, SidebarItem } from "./docs-shared";
import { DEFAULT_LOCALE } from "./docs-shared";

const DOCS_DIR = path.join(process.cwd(), "content/docs");

export type Doc = DocMeta & {
  content: string;
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

export function getAllDocs(locale: Locale = DEFAULT_LOCALE): DocMeta[] {
  let files: string[];
  try {
    files = fs.readdirSync(getDocsDir(locale)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }

  return files
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(getDocsDir(locale), file), "utf-8");
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
  let raw: string;
  try {
    raw = fs.readFileSync(
      path.join(getDocsDir(locale), `${slug}.md`),
      "utf-8",
    );
  } catch {
    return null;
  }

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
