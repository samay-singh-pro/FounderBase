// Matches http(s) URLs and bare www.* URLs. Conservative on purpose — bare
// "example.com" without protocol or www. won't be linkified, which avoids
// turning sentence fragments like "Mr.X" into links.
const URL_PATTERN = /\b(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+\.[^\s<>"']+)/gi

// Punctuation we should trim off the end of a URL since it's almost certainly
// sentence punctuation rather than part of the link.
const TRAILING_PUNCT = /[.,!?:;)\]}'"]+$/

function trim(url: string): string {
  let out = url
  // Strip trailing punctuation, but keep matching parens balanced: if we have
  // a trailing ")" and there's no opening "(" in the URL, drop it.
  while (TRAILING_PUNCT.test(out)) {
    const last = out[out.length - 1]
    if (last === ')' && out.includes('(') && !hasUnbalancedClose(out)) break
    out = out.slice(0, -1)
  }
  return out
}

function hasUnbalancedClose(s: string): boolean {
  let depth = 0
  for (const ch of s) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (depth < 0) return true
  }
  return false
}

export interface LinkifiedSegment {
  type: 'text' | 'url'
  value: string
  href?: string
}

/** Split a string into alternating text/url segments. */
export function linkify(text: string): LinkifiedSegment[] {
  if (!text) return []
  const segments: LinkifiedSegment[] = []
  let lastIndex = 0
  const re = new RegExp(URL_PATTERN.source, URL_PATTERN.flags)
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const raw = match[0]
    const trimmed = trim(raw)
    const start = match.index
    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) })
    }
    const href = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
    segments.push({ type: 'url', value: trimmed, href })
    lastIndex = start + trimmed.length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return segments
}

/** Pull every URL out of a message (post-trim, with normalized href). */
export function extractUrls(text: string): { value: string; href: string }[] {
  return linkify(text)
    .filter((s): s is LinkifiedSegment & { type: 'url' } => s.type === 'url')
    .map((s) => ({ value: s.value, href: s.href! }))
}

/** Best-effort hostname for display (drops protocol + leading www.). */
export function hostnameOf(href: string): string {
  try {
    const url = new URL(href)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return href.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  }
}
