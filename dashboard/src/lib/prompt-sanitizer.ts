export type SanitizeResult = {
  text: string
  maskedCount: number
}

const PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'api_key', regex: /(?:sk|pk|api|key|token|secret|password|bearer)[-_]?[a-zA-Z0-9]{20,}/gi },
  { name: 'jwt', regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
  { name: 'aws_key', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { name: 'ip_address', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g },
  { name: 'private_key', regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA )?PRIVATE KEY-----/g },
]

export const sanitizePrompt = (text: string): SanitizeResult => {
  let maskedCount = 0
  let result = text
  for (const { regex } of PATTERNS) {
    result = result.replace(regex, () => {
      maskedCount++
      return '[MASKED]'
    })
  }
  return { text: result, maskedCount }
}

export const analyzePrompt = (text: string) => {
  const codePatterns = /```[\s\S]*?```|`[^`]+`|function\s+\w+|const\s+\w+|import\s+/
  return {
    length: text.length,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    hasCode: codePatterns.test(text) ? 1 : 0,
  }
}
