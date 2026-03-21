export const str = (v: unknown, fallback = ''): string =>
  v !== undefined && v !== null ? String(v) : fallback

export const num = (v: unknown, fallback: number): number => {
  const n = Number(v)
  return isNaN(n) ? fallback : n
}
