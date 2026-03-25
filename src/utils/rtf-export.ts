import type { Chapter, Section, Book } from '../types'

function escapeRtf(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    // Handle Danish characters
    .replace(/æ/g, "\\'e6")
    .replace(/ø/g, "\\'f8")
    .replace(/å/g, "\\'e5")
    .replace(/Æ/g, "\\'c6")
    .replace(/Ø/g, "\\'d8")
    .replace(/Å/g, "\\'c5")
    .replace(/é/g, "\\'e9")
    .replace(/è/g, "\\'e8")
    .replace(/ê/g, "\\'ea")
    .replace(/ü/g, "\\'fc")
    .replace(/ö/g, "\\'f6")
    .replace(/ä/g, "\\'e4")
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
  const blob = new Blob([content], { type: 'application/rtf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.rtf') ? filename : `${filename}.rtf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
