import { create } from 'zustand'
import type { Book, Section, Chapter } from './types'

function generateId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

const STORAGE_KEY = 'bogskriveren-data'

function loadBook(): Book {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return {
    title: 'Min Bog',
    sections: [],
    goalPages: null,
    updatedAt: now(),
  }
}

function saveBook(book: Book) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(book))
}

interface ActiveView {
  type: 'overview' | 'section' | 'chapter'
  sectionId?: string
  chapterId?: string
}

interface BookStore {
  book: Book
  activeView: ActiveView
  sidebarOpen: boolean

  setActiveView: (view: ActiveView) => void
  toggleSidebar: () => void

  // Book
  updateBookTitle: (title: string) => void
  setBookGoal: (pages: number | null) => void

  // Sections
  addSection: (title: string) => void
  updateSectionTitle: (sectionId: string, title: string) => void
  setSectionGoal: (sectionId: string, pages: number | null) => void
  deleteSection: (sectionId: string) => void
  moveSectionUp: (sectionId: string) => void
  moveSectionDown: (sectionId: string) => void

  // Chapters
  addChapter: (sectionId: string, title: string) => void
  updateChapterTitle: (sectionId: string, chapterId: string, title: string) => void
  updateChapterContent: (sectionId: string, chapterId: string, content: string) => void
  setChapterGoal: (sectionId: string, chapterId: string, pages: number | null) => void
  deleteChapter: (sectionId: string, chapterId: string) => void
  moveChapterUp: (sectionId: string, chapterId: string) => void
  moveChapterDown: (sectionId: string, chapterId: string) => void
}

export const useBookStore = create<BookStore>((set) => {
  const updateBook = (updater: (book: Book) => Book) => {
    set((state) => {
      const updated = updater({ ...state.book, updatedAt: now() })
      saveBook(updated)
      return { book: updated }
    })
  }

  return {
    book: loadBook(),
    activeView: { type: 'overview' },
    sidebarOpen: true,

    setActiveView: (view) => set({ activeView: view }),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

    updateBookTitle: (title) => updateBook((book) => ({ ...book, title })),
    setBookGoal: (pages) => updateBook((book) => ({ ...book, goalPages: pages })),

    addSection: (title) =>
      updateBook((book) => ({
        ...book,
        sections: [
          ...book.sections,
          {
            id: generateId(),
            title,
            chapters: [],
            goalPages: null,
            order: book.sections.length,
            createdAt: now(),
            updatedAt: now(),
          },
        ],
      })),

    updateSectionTitle: (sectionId, title) =>
      updateBook((book) => ({
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId ? { ...s, title, updatedAt: now() } : s
        ),
      })),

    setSectionGoal: (sectionId, pages) =>
      updateBook((book) => ({
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId ? { ...s, goalPages: pages, updatedAt: now() } : s
        ),
      })),

    deleteSection: (sectionId) =>
      set((state) => {
        const book = {
          ...state.book,
          sections: state.book.sections.filter((s) => s.id !== sectionId),
          updatedAt: now(),
        }
        saveBook(book)
        const activeView =
          state.activeView.sectionId === sectionId
            ? { type: 'overview' as const }
            : state.activeView
        return { book, activeView }
      }),

    moveSectionUp: (sectionId) =>
      updateBook((book) => {
        const idx = book.sections.findIndex((s) => s.id === sectionId)
        if (idx <= 0) return book
        const sections = [...book.sections]
        ;[sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]]
        return { ...book, sections }
      }),

    moveSectionDown: (sectionId) =>
      updateBook((book) => {
        const idx = book.sections.findIndex((s) => s.id === sectionId)
        if (idx < 0 || idx >= book.sections.length - 1) return book
        const sections = [...book.sections]
        ;[sections[idx], sections[idx + 1]] = [sections[idx + 1], sections[idx]]
        return { ...book, sections }
      }),

    addChapter: (sectionId, title) =>
      updateBook((book) => ({
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                updatedAt: now(),
                chapters: [
                  ...s.chapters,
                  {
                    id: generateId(),
                    title,
                    content: '',
                    goalPages: null,
                    order: s.chapters.length,
                    createdAt: now(),
                    updatedAt: now(),
                  },
                ],
              }
            : s
        ),
      })),

    updateChapterTitle: (sectionId, chapterId, title) =>
      updateBook((book) => ({
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                chapters: s.chapters.map((c) =>
                  c.id === chapterId ? { ...c, title, updatedAt: now() } : c
                ),
              }
            : s
        ),
      })),

    updateChapterContent: (sectionId, chapterId, content) =>
      updateBook((book) => ({
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                chapters: s.chapters.map((c) =>
                  c.id === chapterId ? { ...c, content, updatedAt: now() } : c
                ),
              }
            : s
        ),
      })),

    setChapterGoal: (sectionId, chapterId, pages) =>
      updateBook((book) => ({
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                chapters: s.chapters.map((c) =>
                  c.id === chapterId ? { ...c, goalPages: pages, updatedAt: now() } : c
                ),
              }
            : s
        ),
      })),

    deleteChapter: (sectionId, chapterId) =>
      set((state) => {
        const book = {
          ...state.book,
          sections: state.book.sections.map((s) =>
            s.id === sectionId
              ? { ...s, chapters: s.chapters.filter((c) => c.id !== chapterId), updatedAt: now() }
              : s
          ),
          updatedAt: now(),
        }
        saveBook(book)
        const activeView =
          state.activeView.chapterId === chapterId
            ? { type: 'section' as const, sectionId }
            : state.activeView
        return { book, activeView }
      }),

    moveChapterUp: (sectionId, chapterId) =>
      updateBook((book) => ({
        ...book,
        sections: book.sections.map((s) => {
          if (s.id !== sectionId) return s
          const idx = s.chapters.findIndex((c) => c.id === chapterId)
          if (idx <= 0) return s
          const chapters = [...s.chapters]
          ;[chapters[idx - 1], chapters[idx]] = [chapters[idx], chapters[idx - 1]]
          return { ...s, chapters }
        }),
      })),

    moveChapterDown: (sectionId, chapterId) =>
      updateBook((book) => ({
        ...book,
        sections: book.sections.map((s) => {
          if (s.id !== sectionId) return s
          const idx = s.chapters.findIndex((c) => c.id === chapterId)
          if (idx < 0 || idx >= s.chapters.length - 1) return s
          const chapters = [...s.chapters]
          ;[chapters[idx], chapters[idx + 1]] = [chapters[idx + 1], chapters[idx]]
          return { ...s, chapters }
        }),
      })),
  }
})
