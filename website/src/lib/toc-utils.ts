export type TocItem = {
  id: string
  text: string
  level: 2 | 3
}

export function extractTocItems(content: string): TocItem[] {
  const lines = content.split('\n')
  const items: TocItem[] = []
  const seen = new Map<string, number>()
  let inCodeBlock = false

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    const h2Match = line.match(/^## (.+)$/)
    const h3Match = line.match(/^### (.+)$/)

    const text = h2Match?.[1]?.trim() ?? h3Match?.[1]?.trim()
    if (!text) continue

    let id = slugifyHeading(text)
    const count = seen.get(id) ?? 0
    seen.set(id, count + 1)
    if (count > 0) id = `${id}-${count}`

    items.push({ id, text, level: h2Match ? 2 : 3 })
  }

  return items
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}
