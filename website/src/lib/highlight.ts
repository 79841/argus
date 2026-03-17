import { codeToHtml } from 'shiki'

export async function highlightCode(code: string, lang: string): Promise<string> {
  const supportedLang = lang || 'text'
  try {
    return await codeToHtml(code, {
      lang: supportedLang,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    })
  } catch {
    return await codeToHtml(code, {
      lang: 'text',
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    })
  }
}
