import { Download } from 'lucide-react'
import { chapterToRtf, sectionToRtf, bookToRtf, downloadRtf } from '../utils/rtf-export'
import type { Chapter, Section, Book } from '../types'

interface Props {
  type: 'chapter' | 'section' | 'book'
  chapter?: Chapter
  section?: Section
  book?: Book
  size?: 'sm' | 'md'
}

export default function ExportButton({ type, chapter, section, book, size = 'sm' }: Props) {
  const handleExport = () => {
    let content = ''
    let filename = ''

    switch (type) {
      case 'chapter':
        if (!chapter) return
        content = chapterToRtf(chapter)
        filename = `${chapter.title}.rtf`
        break
      case 'section':
        if (!section) return
        content = sectionToRtf(section)
        filename = `${section.title}.rtf`
        break
      case 'book':
        if (!book) return
        content = bookToRtf(book)
        filename = `${book.title}.rtf`
        break
    }

    downloadRtf(content, filename)
  }

  if (size === 'sm') {
    return (
      <button
        onClick={handleExport}
        className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-indigo-600 transition-colors"
        title="Eksportér som RTF"
      >
        <Download size={13} />
        Eksportér
      </button>
    )
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-stone-200 rounded-lg text-stone-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
      title="Eksportér som RTF"
    >
      <Download size={15} />
      Eksportér RTF
    </button>
  )
}
