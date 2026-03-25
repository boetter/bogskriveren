import { create } from 'zustand'
import type { Book, Section, Chapter, ApiUsage, AIModelId, AIAnalysis, ChapterImage } from './types'

function generateId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

const STORAGE_KEY = 'bogskriveren-data'

function ensureChapterFields(chapter: any): Chapter {
  return {
    ...chapter,
    versions: chapter.versions || [],
    images: chapter.images || [],
    goalLix: chapter.goalLix ?? null,
  }
}

function ensureBookFields(book: any): Book {
  return {
    ...book,
    goalLix: book.goalLix ?? null,
    sections: (book.sections || []).map((s: any) => ({
      ...s,
      goalLix: s.goalLix ?? null,
      chapters: (s.chapters || []).map(ensureChapterFields),
    })),
  }
}

function loadBookLocal(): Book {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return ensureBookFields(JSON.parse(stored))
  } catch {
    // ignore
  }
  return {
    title: 'Min Bog',
    sections: [],
    goalPages: null,
    goalLix: null,
    updatedAt: now(),
  }
}

function saveBookLocal(book: Book) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(book))
}

interface ActiveView {
  type: 'overview' | 'section' | 'chapter' | 'analyses'
  sectionId?: string
  chapterId?: string
}

interface AIProgress {
  current: number
  total: number
  currentChapterTitle: string
}

interface BookStore {
  book: Book
  activeView: ActiveView
  sidebarOpen: boolean

  // Server sync
  loading: boolean
  saving: boolean
  lastSaved: string | null
  serverAvailable: boolean
  loadFromServer: () => Promise<void>
  saveToServer: () => Promise<void>

  setActiveView: (view: ActiveView) => void
  toggleSidebar: () => void

  // Book
  updateBookTitle: (title: string) => void
  setBookGoal: (pages: number | null) => void
  setBookLixGoal: (lix: number | null) => void

  // Sections
  addSection: (title: string) => void
  updateSectionTitle: (sectionId: string, title: string) => void
  setSectionGoal: (sectionId: string, pages: number | null) => void
  setSectionLixGoal: (sectionId: string, lix: number | null) => void
  deleteSection: (sectionId: string) => void
  moveSectionUp: (sectionId: string) => void
  moveSectionDown: (sectionId: string) => void

  // Chapters
  addChapter: (sectionId: string, title: string) => void
  updateChapterTitle: (sectionId: string, chapterId: string, title: string) => void
  updateChapterContent: (sectionId: string, chapterId: string, content: string) => void
  setChapterGoal: (sectionId: string, chapterId: string, pages: number | null) => void
  setChapterLixGoal: (sectionId: string, chapterId: string, lix: number | null) => void
  deleteChapter: (sectionId: string, chapterId: string) => void
  moveChapterUp: (sectionId: string, chapterId: string) => void
  moveChapterDown: (sectionId: string, chapterId: string) => void

  // AI selection
  aiSelectionMode: boolean
  aiSelectedChapters: Map<string, Set<string>>
  toggleAiSelectionMode: () => void
  toggleChapterSelection: (sectionId: string, chapterId: string) => void
  selectAllInSection: (sectionId: string) => void
  deselectAllInSection: (sectionId: string) => void
  selectAll: () => void
  clearAiSelection: () => void
  getSelectedChapterCount: () => number

  // AI processing
  aiProcessing: boolean
  aiProgress: AIProgress | null
  aiError: string | null
  showAiPanel: boolean
  aiPanelMode: 'process' | 'analyze'
  setShowAiPanel: (show: boolean, mode?: 'process' | 'analyze') => void
  processWithAi: (prompt: string, model: AIModelId) => Promise<void>
  analyzeWithAi: (prompt: string, model: AIModelId) => Promise<void>

  // Analyses
  analyses: AIAnalysis[]
  loadAnalyses: () => Promise<void>

  // Version management
  restoreVersion: (sectionId: string, chapterId: string, versionId: string) => void

  // Images
  generatingImage: boolean
  imageError: string | null
  generateImage: (sectionId: string, chapterId: string, customPrompt?: string) => Promise<void>

  // API usage
  apiUsage: ApiUsage | null
  loadApiUsage: () => Promise<void>
}

let saveDebounceTimer: ReturnType<typeof setTimeout> | undefined

export const useBookStore = create<BookStore>((set, get) => {
  const updateBook = (updater: (book: Book) => Book) => {
    set((state) => {
      const updated = updater({ ...state.book, updatedAt: now() })
      saveBookLocal(updated)
      return { book: updated }
    })
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
    saveDebounceTimer = setTimeout(() => {
      get().saveToServer()
    }, 1000)
  }

  return {
    book: loadBookLocal(),
    activeView: { type: 'overview' },
    sidebarOpen: true,
    loading: false,
    saving: false,
    lastSaved: null,
    serverAvailable: true,

    // AI state
    aiSelectionMode: false,
    aiSelectedChapters: new Map(),
    aiProcessing: false,
    aiProgress: null,
    aiError: null,
    showAiPanel: false,
    aiPanelMode: 'process',
    analyses: [],

    // Image state
    generatingImage: false,
    imageError: null,

    apiUsage: null,

    loadFromServer: async () => {
      set({ loading: true })
      try {
        const res = await fetch('/api/book-load')
        if (res.ok) {
          const book = ensureBookFields(await res.json())
          set({ book, serverAvailable: true })
          saveBookLocal(book)
        } else {
          set({ serverAvailable: false })
        }
      } catch {
        set({ serverAvailable: false })
      } finally {
        set({ loading: false })
      }
    },

    saveToServer: async () => {
      const { book, serverAvailable } = get()
      if (!serverAvailable) return
      set({ saving: true })
      try {
        const res = await fetch('/api/book-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(book),
        })
        if (res.ok) {
          set({ lastSaved: now(), serverAvailable: true })
        } else {
          set({ serverAvailable: false })
        }
      } catch {
        set({ serverAvailable: false })
      } finally {
        set({ saving: false })
      }
    },

    setActiveView: (view) => set({ activeView: view }),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

    updateBookTitle: (title) => updateBook((book) => ({ ...book, title })),
    setBookGoal: (pages) => updateBook((book) => ({ ...book, goalPages: pages })),
    setBookLixGoal: (lix) => updateBook((book) => ({ ...book, goalLix: lix })),

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
            goalLix: null,
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

    setSectionLixGoal: (sectionId, lix) =>
      updateBook((book) => ({
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId ? { ...s, goalLix: lix, updatedAt: now() } : s
        ),
      })),

    deleteSection: (sectionId) =>
      set((state) => {
        const book = {
          ...state.book,
          sections: state.book.sections.filter((s) => s.id !== sectionId),
          updatedAt: now(),
        }
        saveBookLocal(book)
        const activeView =
          state.activeView.sectionId === sectionId
            ? { type: 'overview' as const }
            : state.activeView
        if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
        saveDebounceTimer = setTimeout(() => get().saveToServer(), 1000)
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
                    goalLix: null,
                    order: s.chapters.length,
                    versions: [],
                    images: [],
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

    setChapterLixGoal: (sectionId, chapterId, lix) =>
      updateBook((book) => ({
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                chapters: s.chapters.map((c) =>
                  c.id === chapterId ? { ...c, goalLix: lix, updatedAt: now() } : c
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
        saveBookLocal(book)
        const activeView =
          state.activeView.chapterId === chapterId
            ? { type: 'section' as const, sectionId }
            : state.activeView
        if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
        saveDebounceTimer = setTimeout(() => get().saveToServer(), 1000)
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

    // AI Selection
    toggleAiSelectionMode: () =>
      set((s) => ({
        aiSelectionMode: !s.aiSelectionMode,
        aiSelectedChapters: s.aiSelectionMode ? new Map() : s.aiSelectedChapters,
        showAiPanel: false,
      })),

    toggleChapterSelection: (sectionId, chapterId) =>
      set((s) => {
        const newMap = new Map(s.aiSelectedChapters)
        const sectionSet = new Set(newMap.get(sectionId) || [])
        if (sectionSet.has(chapterId)) {
          sectionSet.delete(chapterId)
        } else {
          sectionSet.add(chapterId)
        }
        if (sectionSet.size === 0) {
          newMap.delete(sectionId)
        } else {
          newMap.set(sectionId, sectionSet)
        }
        return { aiSelectedChapters: newMap }
      }),

    selectAllInSection: (sectionId) =>
      set((s) => {
        const section = s.book.sections.find((sec) => sec.id === sectionId)
        if (!section) return s
        const newMap = new Map(s.aiSelectedChapters)
        newMap.set(sectionId, new Set(section.chapters.map((c) => c.id)))
        return { aiSelectedChapters: newMap }
      }),

    deselectAllInSection: (sectionId) =>
      set((s) => {
        const newMap = new Map(s.aiSelectedChapters)
        newMap.delete(sectionId)
        return { aiSelectedChapters: newMap }
      }),

    selectAll: () =>
      set((s) => {
        const newMap = new Map<string, Set<string>>()
        for (const section of s.book.sections) {
          if (section.chapters.length > 0) {
            newMap.set(section.id, new Set(section.chapters.map((c) => c.id)))
          }
        }
        return { aiSelectedChapters: newMap }
      }),

    clearAiSelection: () => set({ aiSelectedChapters: new Map() }),

    getSelectedChapterCount: () => {
      const { aiSelectedChapters } = get()
      let count = 0
      for (const chapterSet of aiSelectedChapters.values()) {
        count += chapterSet.size
      }
      return count
    },

    setShowAiPanel: (show, mode) =>
      set({ showAiPanel: show, aiPanelMode: mode || 'process' }),

    processWithAi: async (prompt, model) => {
      const state = get()
      const { aiSelectedChapters, book } = state

      const selectedItems: { section: Section; chapter: Chapter }[] = []
      for (const [sectionId, chapterIds] of aiSelectedChapters) {
        const section = book.sections.find((s) => s.id === sectionId)
        if (!section) continue
        for (const chapterId of chapterIds) {
          const chapter = section.chapters.find((c) => c.id === chapterId)
          if (chapter && chapter.content.trim()) {
            selectedItems.push({ section, chapter })
          }
        }
      }

      if (selectedItems.length === 0) {
        set({ aiError: 'Ingen kapitler med indhold er valgt.' })
        return
      }

      set({
        aiProcessing: true,
        aiError: null,
        aiProgress: { current: 0, total: selectedItems.length, currentChapterTitle: '' },
      })

      try {
        for (let i = 0; i < selectedItems.length; i++) {
          const { section, chapter } = selectedItems[i]
          set({
            aiProgress: {
              current: i,
              total: selectedItems.length,
              currentChapterTitle: chapter.title,
            },
          })

          const res = await fetch('/api/ai-process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: chapter.content,
              prompt,
              model,
              chapterTitle: chapter.title,
            }),
          })

          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || `Fejl ved behandling af "${chapter.title}"`)
          }

          const result = await res.json()

          updateBook((book) => ({
            ...book,
            sections: book.sections.map((s) =>
              s.id === section.id
                ? {
                    ...s,
                    chapters: s.chapters.map((c) =>
                      c.id === chapter.id
                        ? {
                            ...c,
                            versions: [
                              ...c.versions,
                              {
                                id: generateId(),
                                content: c.content,
                                createdAt: now(),
                                source: 'ai' as const,
                                prompt,
                                model,
                              },
                            ],
                            content: result.content,
                            updatedAt: now(),
                          }
                        : c
                    ),
                  }
                : s
            ),
          }))
        }

        set({
          aiProgress: {
            current: selectedItems.length,
            total: selectedItems.length,
            currentChapterTitle: '',
          },
        })
        get().saveToServer()
        get().loadApiUsage()
      } catch (error: any) {
        set({ aiError: error.message || 'AI-behandling fejlede' })
      } finally {
        set({ aiProcessing: false })
      }
    },

    analyzeWithAi: async (prompt, model) => {
      const state = get()
      const { aiSelectedChapters, book } = state

      const chapters: { title: string; content: string }[] = []
      for (const [sectionId, chapterIds] of aiSelectedChapters) {
        const section = book.sections.find((s) => s.id === sectionId)
        if (!section) continue
        for (const chapterId of chapterIds) {
          const chapter = section.chapters.find((c) => c.id === chapterId)
          if (chapter && chapter.content.trim()) {
            chapters.push({ title: chapter.title, content: chapter.content })
          }
        }
      }

      if (chapters.length === 0) {
        set({ aiError: 'Ingen kapitler med indhold er valgt.' })
        return
      }

      set({ aiProcessing: true, aiError: null, aiProgress: { current: 0, total: 1, currentChapterTitle: 'Analyserer...' } })

      try {
        const res = await fetch('/api/ai-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapters, prompt, model }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'AI-analyse fejlede')
        }

        const result = await res.json()
        set((s) => ({
          analyses: [...s.analyses, result.analysis],
          aiProgress: { current: 1, total: 1, currentChapterTitle: '' },
        }))
        get().loadApiUsage()
      } catch (error: any) {
        set({ aiError: error.message || 'AI-analyse fejlede' })
      } finally {
        set({ aiProcessing: false })
      }
    },

    // Analyses
    loadAnalyses: async () => {
      try {
        const res = await fetch('/api/load-analyses')
        if (res.ok) {
          const analyses = await res.json()
          set({ analyses })
        }
      } catch {
        // ignore
      }
    },

    // Version management
    restoreVersion: (sectionId, chapterId, versionId) =>
      updateBook((book) => ({
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                chapters: s.chapters.map((c) => {
                  if (c.id !== chapterId) return c
                  const version = c.versions.find((v) => v.id === versionId)
                  if (!version) return c
                  return {
                    ...c,
                    versions: [
                      ...c.versions,
                      {
                        id: generateId(),
                        content: c.content,
                        createdAt: now(),
                        source: 'manual' as const,
                      },
                    ],
                    content: version.content,
                    updatedAt: now(),
                  }
                }),
              }
            : s
        ),
      })),

    // Image generation
    generateImage: async (sectionId, chapterId, customPrompt) => {
      const { book } = get()
      const section = book.sections.find((s) => s.id === sectionId)
      const chapter = section?.chapters.find((c) => c.id === chapterId)
      if (!chapter) return

      set({ generatingImage: true, imageError: null })

      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapterContent: chapter.content,
            chapterTitle: chapter.title,
            customPrompt,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Billedgenerering fejlede')
        }

        const result = await res.json()

        const newImage: ChapterImage = {
          id: generateId(),
          imageData: result.imageData,
          prompt: customPrompt || 'Auto-genereret illustration',
          createdAt: now(),
        }

        updateBook((book) => ({
          ...book,
          sections: book.sections.map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  chapters: s.chapters.map((c) =>
                    c.id === chapterId
                      ? { ...c, images: [...c.images, newImage], updatedAt: now() }
                      : c
                  ),
                }
              : s
          ),
        }))
      } catch (error: any) {
        set({ imageError: error.message || 'Billedgenerering fejlede' })
      } finally {
        set({ generatingImage: false })
      }
    },

    // API usage
    loadApiUsage: async () => {
      try {
        const res = await fetch('/api/api-usage')
        if (res.ok) {
          const usage = await res.json()
          set({ apiUsage: usage })
        }
      } catch {
        // ignore
      }
    },
  }
})
