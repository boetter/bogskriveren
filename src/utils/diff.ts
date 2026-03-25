export interface DiffSegment {
  type: 'equal' | 'added' | 'removed'
  text: string
}

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter(Boolean)
}

// Simple LCS-based word diff
function lcs(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp
}

export function computeDiff(oldHtml: string, newHtml: string): DiffSegment[] {
  const oldText = stripHtml(oldHtml)
  const newText = stripHtml(newHtml)

  const oldTokens = tokenize(oldText)
  const newTokens = tokenize(newText)

  // Limit for performance
  const maxTokens = 5000
  const a = oldTokens.slice(0, maxTokens)
  const b = newTokens.slice(0, maxTokens)

  const dp = lcs(a, b)
  const segments: DiffSegment[] = []

  let i = a.length
  let j = b.length
  const result: DiffSegment[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ type: 'equal', text: a[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', text: b[j - 1] })
      j--
    } else {
      result.push({ type: 'removed', text: a[i - 1] })
      i--
    }
  }

  result.reverse()

  // Merge consecutive segments of same type
  for (const seg of result) {
    if (segments.length > 0 && segments[segments.length - 1].type === seg.type) {
      segments[segments.length - 1].text += seg.text
    } else {
      segments.push({ ...seg })
    }
  }

  return segments
}
