import type { PageEstimate, Chapter, Section, Book } from '../types'

// Standard book page: ~250 words per page (standard for published books)
const WORDS_PER_PAGE = 250

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function estimateFromHtml(html: string): PageEstimate {
  const text = stripHtml(html)
  const words = countWords(text)
  const characters = text.length
  const pages = words / WORDS_PER_PAGE

  return { words, characters, pages }
}

export function estimateChapter(chapter: Chapter): PageEstimate {
  return estimateFromHtml(chapter.content)
}

export function estimateSection(section: Section): PageEstimate {
  const estimates = section.chapters.map(estimateChapter)
  return {
    words: estimates.reduce((sum, e) => sum + e.words, 0),
    characters: estimates.reduce((sum, e) => sum + e.characters, 0),
    pages: estimates.reduce((sum, e) => sum + e.pages, 0),
  }
}

export function estimateBook(book: Book): PageEstimate {
  const estimates = book.sections.map(estimateSection)
  return {
    words: estimates.reduce((sum, e) => sum + e.words, 0),
    characters: estimates.reduce((sum, e) => sum + e.characters, 0),
    pages: estimates.reduce((sum, e) => sum + e.pages, 0),
  }
}

export function formatPages(pages: number): string {
  if (pages < 0.1) return '0'
  if (pages < 1) return pages.toFixed(1)
  return Math.round(pages).toString()
}
