import type { Chapter, Section, Book } from '../types'

// Map common Unicode characters to Windows-1252 RTF hex escapes.
// Any character outside the Windows-1252 range falls back to \uN? (Unicode escape).
const WIN1252: Record<number, string> = {
  0x00c0: 'c0', 0x00c1: 'c1', 0x00c2: 'c2', 0x00c3: 'c3', 0x00c4: 'c4', 0x00c5: 'c5',
  0x00c6: 'c6', 0x00c7: 'c7', 0x00c8: 'c8', 0x00c9: 'c9', 0x00ca: 'ca', 0x00cb: 'cb',
  0x00cc: 'cc', 0x00cd: 'cd', 0x00ce: 'ce', 0x00cf: 'cf', 0x00d0: 'd0', 0x00d1: 'd1',
  0x00d2: 'd2', 0x00d3: 'd3', 0x00d4: 'd4', 0x00d5: 'd5', 0x00d6: 'd6', 0x00d8: 'd8',
  0x00d9: 'd9', 0x00da: 'da', 0x00db: 'db', 0x00dc: 'dc', 0x00dd: 'dd', 0x00de: 'de',
  0x00df: 'df', 0x00e0: 'e0', 0x00e1: 'e1', 0x00e2: 'e2', 0x00e3: 'e3', 0x00e4: 'e4',
  0x00e5: 'e5', 0x00e6: 'e6', 0x00e7: 'e7', 0x00e8: 'e8', 0x00e9: 'e9', 0x00ea: 'ea',
  0x00eb: 'eb', 0x00ec: 'ec', 0x00ed: 'ed', 0x00ee: 'ee', 0x00ef: 'ef', 0x00f0: 'f0',
  0x00f1: 'f1', 0x00f2: 'f2', 0x00f3: 'f3', 0x00f4: 'f4', 0x00f5: 'f5', 0x00f6: 'f6',
  0x00f8: 'f8', 0x00f9: 'f9', 0x00fa: 'fa', 0x00fb: 'fb', 0x00fc: 'fc', 0x00fd: 'fd',
  0x00fe: 'fe', 0x00ff: 'ff',
  // Windows-1252 extras (0x80–0x9F range)
  0x20ac: '80', // €
  0x201a: '82', // ‚
  0x0192: '83', // ƒ
  0x201e: '84', // „
  0x2026: '85', // …
  0x2020: '86', // †
  0x2021: '87', // ‡
  0x02c6: '88', // ˆ
  0x2030: '89', // ‰
  0x0160: '8a', // Š
  0x2039: '8b', // ‹
  0x0152: '8c', // Œ
  0x017d: '8e', // Ž
  0x2018: '91', // '
  0x2019: '92', // '
  0x201c: '93', // "
  0x201d: '94', // "
  0x2022: '95', // •
  0x2013: '96', // –  en dash
  0x2014: '97', // —  em dash
  0x02dc: '98', // ˜
  0x2122: '99', // ™
  0x0161: '9a', // š
  0x203a: '9b', // ›
  0x0153: '9c', // œ
  0x017e: '9e', // ž
  0x0178: '9f', // Ÿ
  0x00a0: 'a0', 0x00a1: 'a1', 0x00a2: 'a2', 0x00a3: 'a3', 0x00a4: 'a4', 0x00a5: 'a5',
  0x00a6: 'a6', 0x00a7: 'a7', 0x00a8: 'a8', 0x00a9: 'a9', 0x00aa: 'aa', 0x00ab: 'ab',
  0x00ac: 'ac', 0x00ad: 'ad', 0x00ae: 'ae', 0x00af: 'af', 0x00b0: 'b0', 0x00b1: 'b1',
  0x00b2: 'b2', 0x00b3: 'b3', 0x00b4: 'b4', 0x00b5: 'b5', 0x00b6: 'b6', 0x00b7: 'b7',
  0x00b8: 'b8', 0x00b9: 'b9', 0x00ba: 'ba', 0x00bb: 'bb', 0x00bc: 'bc', 0x00bd: 'bd',
  0x00be: 'be', 0x00bf: 'bf',
}

function escapeRtf(text: string): string {
  let result = ''
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code < 0x20 && code !== 0x0a && code !== 0x0d) {
      // Skip control characters
    } else if (code < 0x80) {
      // ASCII – only escape the three RTF special characters
      if (char === '\\') result += '\\\\'
      else if (char === '{') result += '\\{'
      else if (char === '}') result += '\\}'
      else result += char
    } else if (WIN1252[code]) {
      result += `\\'${WIN1252[code]}`
    } else {
      // Fallback: RTF Unicode escape \uN followed by a replacement char
      result += `\\u${code}?`
    }
  }
  return result
}

function htmlToRtf(html: string): string {
  let rtf = ''

  // Parse HTML using DOM
  const div = document.createElement('div')
  div.innerHTML = html

  function processNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      rtf += escapeRtf(node.textContent || '')
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    switch (tag) {
      case 'h1':
        rtf += '\\par\\pard\\sb240\\sa120{\\fs36\\b '
        processChildren(el)
        rtf += '\\b0\\fs24}\\par '
        break
      case 'h2':
        rtf += '\\par\\pard\\sb200\\sa100{\\fs32\\b '
        processChildren(el)
        rtf += '\\b0\\fs24}\\par '
        break
      case 'h3':
        rtf += '\\par\\pard\\sb160\\sa80{\\fs28\\b '
        processChildren(el)
        rtf += '\\b0\\fs24}\\par '
        break
      case 'p':
        rtf += '\\par\\pard\\sa120 '
        processChildren(el)
        break
      case 'strong':
      case 'b':
        rtf += '{\\b '
        processChildren(el)
        rtf += '}'
        break
      case 'em':
      case 'i':
        rtf += '{\\i '
        processChildren(el)
        rtf += '}'
        break
      case 'u':
        rtf += '{\\ul '
        processChildren(el)
        rtf += '}'
        break
      case 's':
      case 'strike':
        rtf += '{\\strike '
        processChildren(el)
        rtf += '}'
        break
      case 'blockquote':
        rtf += '\\par\\pard\\li720\\ri720\\sa120{\\i '
        processChildren(el)
        rtf += '}\\par\\pard '
        break
      case 'ul':
        processChildren(el)
        break
      case 'ol':
        processChildren(el)
        break
      case 'li':
        rtf += '\\par\\pard\\li360\\fi-360{\\bullet\\tab '
        processChildren(el)
        rtf += '}'
        break
      case 'br':
        rtf += '\\line '
        break
      case 'hr':
        rtf += '\\par\\pard\\brdrb\\brdrs\\brdrw10\\brsp20 \\par\\pard '
        break
      case 'mark':
        rtf += '{\\highlight7 '
        processChildren(el)
        rtf += '}'
        break
      default:
        processChildren(el)
    }
  }

  function processChildren(el: HTMLElement): void {
    for (const child of Array.from(el.childNodes)) {
      processNode(child)
    }
  }

  processChildren(div)
  return rtf
}

function wrapRtf(content: string): string {
  return (
    '{\\rtf1\\ansi\\ansicpg1252\\deff0\n' +
    '{\\fonttbl{\\f0\\froman\\fcharset0 Times New Roman;}{\\f1\\fswiss\\fcharset0 Arial;}}\n' +
    '{\\colortbl;\\red0\\green0\\blue0;\\red100\\green100\\blue100;}\n' +
    '\\f0\\fs24\\lang1030\n' +
    content +
    '\n}'
  )
}

export function chapterToRtf(chapter: Chapter): string {
  let content = ''
  content += `{\\fs36\\b ${escapeRtf(chapter.title)}}\\par\\par `
  content += htmlToRtf(chapter.content)
  return wrapRtf(content)
}

export function sectionToRtf(section: Section): string {
  let content = ''
  content += `{\\fs40\\b ${escapeRtf(section.title)}}\\par\\par `

  for (const chapter of section.chapters) {
    content += `{\\fs36\\b ${escapeRtf(chapter.title)}}\\par\\par `
    content += htmlToRtf(chapter.content)
    content += '\\page '
  }

  return wrapRtf(content)
}

export function bookToRtf(book: Book): string {
  let content = ''
  // Title page
  content += '\\par\\par\\par\\par\\par\\qc '
  content += `{\\fs56\\b ${escapeRtf(book.title)}}\\par `
  content += '\\qr\\page '

  for (const section of book.sections) {
    content += `{\\fs40\\b ${escapeRtf(section.title)}}\\par\\par `

    for (const chapter of section.chapters) {
      content += `{\\fs36\\b ${escapeRtf(chapter.title)}}\\par\\par `
      content += htmlToRtf(chapter.content)
      content += '\\page '
    }
  }

  return wrapRtf(content)
}

export function downloadRtf(content: string, filename: string): void {
  // RTF must be written as raw bytes (Latin-1 / Windows-1252), not UTF-8.
  // The content at this point is pure ASCII + \' hex escapes, so a simple
  // byte-by-byte encoding is safe.
  const bytes = new Uint8Array(content.length)
  for (let i = 0; i < content.length; i++) {
    bytes[i] = content.charCodeAt(i) & 0xff
  }
  const blob = new Blob([bytes], { type: 'application/rtf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.rtf') ? filename : `${filename}.rtf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
