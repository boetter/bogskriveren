import type { Chapter, Section, Book } from '../types'

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

export interface LixResult {
  score: number
  label: string
  words: number
  sentences: number
  longWords: number
}

export function calculateLix(html: string): LixResult {
  const text = stripHtml(html).trim()

  if (!text) {
    return { score: 0, label: '-', words: 0, sentences: 0, longWords: 0 }
  }

  // Count words
  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  if (wordCount === 0) {
    return { score: 0, label: '-', words: 0, sentences: 0, longWords: 0 }
  }

  // Count sentences (periods, question marks, exclamation marks)
  const sentenceCount = Math.max(1, (text.match(/[.!?]+/g) || []).length)

  // Count long words (more than 6 characters)
  const longWordCount = words.filter((w) => w.replace(/[^a-zA-ZæøåÆØÅ]/g, '').length > 6).length

  // LIX = (words / sentences) + (longWords * 100 / words)
  const lix = wordCount / sentenceCount + (longWordCount * 100) / wordCount
  const score = Math.round(lix)

  return {
    score,
    label: getLixLabel(score),
    words: wordCount,
    sentences: sentenceCount,
    longWords: longWordCount,
  }
}

function getLixLabel(lix: number): string {
  if (lix < 25) return 'Meget let'
  if (lix < 35) return 'Let'
  if (lix < 45) return 'Middel'
  if (lix < 55) return 'Svær'
  return 'Meget svær'
}

export function calculateChapterLix(chapter: Chapter): LixResult {
  return calculateLix(chapter.content)
}

export function calculateSectionLix(section: Section): LixResult {
  if (section.chapters.length === 0) {
    return { score: 0, label: '-', words: 0, sentences: 0, longWords: 0 }
  }

  const allContent = section.chapters.map((c) => c.content).join(' ')
  return calculateLix(allContent)
}

export function calculateBookLix(book: Book): LixResult {
  const allContent = book.sections.flatMap((s) => s.chapters.map((c) => c.content)).join(' ')
  return calculateLix(allContent)
}

export function lixColor(score: number, goal?: number | null): string {
  if (goal) {
    const diff = Math.abs(score - goal)
    if (diff <= 3) return 'text-emerald-600'
    if (diff <= 8) return 'text-amber-600'
    return 'text-red-600'
  }
  if (score === 0) return 'text-stone-400'
  if (score < 35) return 'text-emerald-600'
  if (score < 45) return 'text-indigo-600'
  if (score < 55) return 'text-amber-600'
  return 'text-red-600'
}
