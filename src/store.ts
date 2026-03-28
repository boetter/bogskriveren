import { create } from 'zustand'
import type { Book, Section, Chapter, ApiUsage, AIModelId, AIAnalysis, ChapterImage, ChapterStatusId, PendingBatch } from './types'

function generateId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

const STORAGE_KEY = 'bogskriveren-data'
const BATCHES_KEY = 'bogskriveren-pending-batches'

function loadPendingBatches(): PendingBatch[] {
  try {
    const stored = localStorage.getItem(BATCHES_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function savePendingBatches(batches: PendingBatch[]) {
  localStorage.setItem(BATCHES_KEY, JSON.stringify(batches))
}

function ensureChapterFields(chapter: any): Chapter {
  return {
    ...chapter,
    versions: chapter.versions || [],
    images: chapter.images || [],
    goalLix: chapter.goalLix ?? null,
    status: chapter.status || 'ikke-paabegyndt',
    keywords: chapter.keywords || [],
    score: chapter.score ?? null,
    scoreQuestion: chapter.scoreQuestion ?? null,
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

interface AILogEntry {
  timestamp: string
  level: 'info' | 'success' | 'error' | 'warn'
  message: string
  details?: any
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

  // Chapter status
  setChapterStatus: (sectionId: string, chapterId: string, status: ChapterStatusId) => void

  // AI processing
  aiProcessing: boolean
  aiProgress: AIProgress | null
  aiError: string | null
  aiDebugInfo: any | null
  aiLog: AILogEntry[]
  showAiPanel: boolean
  aiPanelMode: 'process' | 'analyze'
  setShowAiPanel: (show: boolean, mode?: 'process' | 'analyze') => void
  processWithAi: (prompt: string, model: AIModelId) => Promise<void>
  analyzeWithAi: (prompt: string, model: AIModelId) => Promise<void>
  processChapterWithAi: (sectionId: string, chapterId: string, prompt: string, model: AIModelId) => Promise<void>

  // Batch processing
  pendingBatches: PendingBatch[]
  batchChecking: boolean
  submitBatch: (type: 'process' | 'analyze', prompt: string, model: AIModelId) => Promise<void>
  submitChapterBatch: (sectionId: string, chapterId: string, prompt: string, model: AIModelId) => Promise<void>
  checkBatches: () => Promise<void>
  removeBatch: (batchId: string) => void

  // Keywords & Scores
  keywordsProcessing: boolean
  scoreProcessing: boolean
  analyzeKeywords: (model?: AIModelId) => Promise<void>
  analyzeScores: (question: string, model?: AIModelId) => Promise<void>

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
    aiDebugInfo: null,
    aiLog: [],
    showAiPanel: false,
    aiPanelMode: 'process',
    analyses: [],
    keywordsProcessing: false,
    scoreProcessing: false,
    pendingBatches: loadPendingBatches(),
    batchChecking: false,

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
                    status: 'ikke-paabegyndt' as const,
                    keywords: [],
                    score: null,
                    scoreQuestion: null,
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

    setChapterStatus: (sectionId, chapterId, status) =>
      updateBook((book) => ({
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                chapters: s.chapters.map((c) =>
                  c.id === chapterId ? { ...c, status, updatedAt: now() } : c
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
      await get().submitBatch('process', prompt, model)
    },

    analyzeWithAi: async (prompt, model) => {
      await get().submitBatch('analyze', prompt, model)
    },

    processChapterWithAi: async (sectionId, chapterId, prompt, model) => {
      await get().submitChapterBatch(sectionId, chapterId, prompt, model)
    },

    // Batch processing — fire and forget
    submitBatch: async (type, prompt, model) => {
      const addLog = (level: AILogEntry['level'], message: string, details?: any) => {
        set((s) => ({
          aiLog: [...s.aiLog, { timestamp: new Date().toISOString(), level, message, details }],
        }))
      }

      const state = get()
      const { aiSelectedChapters, book } = state

      if (type === 'process') {
        const chapters: { id: string; sectionId: string; title: string; content: string }[] = []
        for (const [sectionId, chapterIds] of aiSelectedChapters) {
          const section = book.sections.find((s) => s.id === sectionId)
          if (!section) continue
          for (const chapterId of chapterIds) {
            const chapter = section.chapters.find((c) => c.id === chapterId)
            if (chapter && chapter.content.trim()) {
              chapters.push({ id: chapter.id, sectionId, title: chapter.title, content: chapter.content })
            }
          }
        }

        if (chapters.length === 0) {
          set({ aiError: 'Ingen kapitler med indhold er valgt.' })
          return
        }

        set({ aiProcessing: true, aiError: null, aiLog: [] })
        addLog('info', `Opretter redigerings-batch for ${chapters.length} kapitler...`)

        try {
          const res = await fetch('/api/ai-batch-submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'process',
              chapters,
              prompt,
              model,
            }),
          })

          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Kunne ikke oprette batch')
          }

          const { batchId } = await res.json()
          const batch: PendingBatch = {
            batchId,
            type: 'process',
            prompt,
            model,
            submittedAt: new Date().toISOString(),
            chapters: chapters.map((c) => ({ id: c.id, sectionId: c.sectionId, title: c.title })),
          }

          const updated = [...get().pendingBatches, batch]
          savePendingBatches(updated)
          set({ pendingBatches: updated })
          addLog('success', `Batch oprettet: ${batchId}`)
          addLog('info', 'Batchen behandles i baggrunden. Tryk "Tjek batches" for at se om den er færdig.')
        } catch (error: any) {
          addLog('error', `FEJL: ${error.message}`)
          set({ aiError: error.message })
        } finally {
          set({ aiProcessing: false })
        }
      } else {
        // analyze
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

        set({ aiProcessing: true, aiError: null, aiLog: [] })
        addLog('info', `Opretter analyse-batch for ${chapters.length} kapitler...`)

        try {
          const res = await fetch('/api/ai-batch-submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'analyze', chapters, prompt, model }),
          })

          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Kunne ikke oprette batch')
          }

          const { batchId } = await res.json()
          const batch: PendingBatch = {
            batchId,
            type: 'analyze',
            prompt,
            model,
            submittedAt: new Date().toISOString(),
            chapterTitles: chapters.map((c) => c.title),
          }

          const updated = [...get().pendingBatches, batch]
          savePendingBatches(updated)
          set({ pendingBatches: updated })
          addLog('success', `Batch oprettet: ${batchId}`)
          addLog('info', 'Batchen behandles i baggrunden. Tryk "Tjek batches" for at se om den er færdig.')
        } catch (error: any) {
          addLog('error', `FEJL: ${error.message}`)
          set({ aiError: error.message })
        } finally {
          set({ aiProcessing: false })
        }
      }
    },

    submitChapterBatch: async (sectionId, chapterId, prompt, model) => {
      const { book } = get()
      const section = book.sections.find((s) => s.id === sectionId)
      const chapter = section?.chapters.find((c) => c.id === chapterId)
      if (!chapter || !chapter.content.trim()) {
        set({ aiError: 'Kapitlet har intet indhold.' })
        return
      }

      set({ aiProcessing: true, aiError: null })

      try {
        const res = await fetch('/api/ai-batch-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'process',
            chapters: [{ id: chapterId, sectionId, title: chapter.title, content: chapter.content }],
            prompt,
            model,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Kunne ikke oprette batch')
        }

        const { batchId } = await res.json()
        const batch: PendingBatch = {
          batchId,
          type: 'process',
          prompt,
          model,
          submittedAt: new Date().toISOString(),
          chapters: [{ id: chapterId, sectionId, title: chapter.title }],
        }

        const updated = [...get().pendingBatches, batch]
        savePendingBatches(updated)
        set({ pendingBatches: updated })
      } catch (error: any) {
        set({ aiError: error.message })
      } finally {
        set({ aiProcessing: false })
      }
    },

    checkBatches: async () => {
      const { pendingBatches } = get()
      if (pendingBatches.length === 0) return

      set({ batchChecking: true, aiError: null, aiLog: [] })

      const addLog = (level: AILogEntry['level'], message: string, details?: any) => {
        set((s) => ({
          aiLog: [...s.aiLog, { timestamp: new Date().toISOString(), level, message, details }],
        }))
      }

      addLog('info', `Tjekker ${pendingBatches.length} batch(es)...`)

      const remaining: PendingBatch[] = []

      for (const batch of pendingBatches) {
        try {
          const res = await fetch('/api/ai-batch-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              batchId: batch.batchId,
              type: batch.type,
              prompt: batch.prompt,
              model: batch.model,
              chapterTitles: batch.chapterTitles,
            }),
          })

          if (!res.ok) {
            addLog('warn', `Batch ${batch.batchId.substring(0, 20)}... fejlede at tjekke`)
            remaining.push(batch)
            continue
          }

          const data = await res.json()

          if (data.status !== 'ended') {
            const counts = data.counts || {}
            addLog('info', `Batch "${batch.type}" (${batch.batchId.substring(0, 20)}...): stadig i gang (${counts.processing || 0} behandles, ${counts.succeeded || 0} færdige)`)
            remaining.push(batch)
            continue
          }

          // Batch is done — apply results
          if (batch.type === 'process' && batch.chapters) {
            let ok = 0
            let fail = 0
            for (const r of data.results || []) {
              const parts = r.customId.split('--')
              const rSectionId = parts[1]
              const rChapterId = parts[2]
              const chInfo = batch.chapters.find((c) => c.id === rChapterId)

              if (r.status === 'succeeded' && r.content?.trim()) {
                updateBook((book) => ({
                  ...book,
                  sections: book.sections.map((s) =>
                    s.id === rSectionId
                      ? {
                          ...s,
                          chapters: s.chapters.map((c) =>
                            c.id === rChapterId
                              ? {
                                  ...c,
                                  versions: [
                                    ...c.versions,
                                    {
                                      id: generateId(),
                                      content: c.content,
                                      createdAt: now(),
                                      source: 'ai' as const,
                                      prompt: batch.prompt,
                                      model: batch.model,
                                    },
                                  ],
                                  content: r.content,
                                  updatedAt: now(),
                                }
                              : c
                          ),
                        }
                      : s
                  ),
                }))
                addLog('success', `"${chInfo?.title || rChapterId}" redigeret OK`, r.usage)
                ok++
              } else {
                addLog('error', `"${chInfo?.title || rChapterId}" fejlede: ${r.error || r.status}`)
                fail++
              }
            }
            addLog(fail > 0 ? 'warn' : 'success', `Redigerings-batch færdig: ${ok} ok, ${fail} fejl`)
            get().saveToServer()
          } else if (batch.type === 'analyze') {
            // The analysis was already stored server-side by ai-batch-status
            await get().loadAnalyses()
            addLog('success', `Analyse-batch færdig! Se "AI-analyser" i sidebaren.`)
          } else if (batch.type === 'keywords' && batch.chapters) {
            const keywordUpdates: { chapterId: string; sectionId: string; keywords: string[] }[] = []
            for (const r of data.results || []) {
              const parts = r.customId.split('--')
              const rSectionId = parts[1]
              const rChapterId = parts[2]
              if (r.status === 'succeeded' && r.content) {
                const match = r.content.match(/\[[\s\S]*?\]/)
                if (match) {
                  try {
                    const keywords = JSON.parse(match[0]).filter((k: any) => typeof k === 'string').slice(0, 10)
                    keywordUpdates.push({ chapterId: rChapterId, sectionId: rSectionId, keywords })
                  } catch { /* ignore */ }
                }
              }
            }
            if (keywordUpdates.length > 0) {
              updateBook((book) => ({
                ...book,
                sections: book.sections.map((s) => ({
                  ...s,
                  chapters: s.chapters.map((c) => {
                    const u = keywordUpdates.find((x) => x.chapterId === c.id && x.sectionId === s.id)
                    return u ? { ...c, keywords: u.keywords, updatedAt: now() } : c
                  }),
                })),
              }))
            }
            addLog('success', `Nøgleords-batch færdig: ${keywordUpdates.length} kapitler opdateret`)
            get().saveToServer()
          } else if (batch.type === 'scores' && batch.chapters) {
            const question = batch.question || ''
            const scoreUpdates: { chapterId: string; sectionId: string; score: number }[] = []
            for (const r of data.results || []) {
              const parts = r.customId.split('--')
              const rSectionId = parts[1]
              const rChapterId = parts[2]
              if (r.status === 'succeeded' && r.content) {
                const match = r.content.match(/\{[\s\S]*?\}/)
                if (match) {
                  try {
                    const parsed = JSON.parse(match[0])
                    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)))
                    scoreUpdates.push({ chapterId: rChapterId, sectionId: rSectionId, score })
                  } catch { /* ignore */ }
                }
              }
            }
            if (scoreUpdates.length > 0) {
              updateBook((book) => ({
                ...book,
                sections: book.sections.map((s) => ({
                  ...s,
                  chapters: s.chapters.map((c) => {
                    const u = scoreUpdates.find((x) => x.chapterId === c.id && x.sectionId === s.id)
                    return u ? { ...c, score: u.score, scoreQuestion: question, updatedAt: now() } : c
                  }),
                })),
              }))
            }
            addLog('success', `Score-batch færdig: ${scoreUpdates.length} kapitler scoret`)
            get().saveToServer()
          }

          get().loadApiUsage()
          // Don't add to remaining — it's done
        } catch (error: any) {
          addLog('error', `Fejl ved tjek af batch ${batch.batchId.substring(0, 20)}...: ${error.message}`)
          remaining.push(batch)
        }
      }

      savePendingBatches(remaining)
      set({ pendingBatches: remaining, batchChecking: false })
    },

    removeBatch: (batchId) => {
      const updated = get().pendingBatches.filter((b) => b.batchId !== batchId)
      savePendingBatches(updated)
      set({ pendingBatches: updated })
    },

    // Keywords analysis — now uses batch API
    analyzeKeywords: async (model = 'claude-haiku-4-5') => {
      const { aiSelectedChapters, book } = get()

      const chapters: { id: string; sectionId: string; title: string; content: string }[] = []
      for (const [sectionId, chapterIds] of aiSelectedChapters) {
        const section = book.sections.find((s) => s.id === sectionId)
        if (!section) continue
        for (const chapterId of chapterIds) {
          const chapter = section.chapters.find((c) => c.id === chapterId)
          if (chapter && chapter.content.trim()) {
            chapters.push({ id: chapter.id, sectionId, title: chapter.title, content: chapter.content })
          }
        }
      }

      if (chapters.length === 0) {
        set({ aiError: 'Ingen kapitler med indhold er valgt.' })
        return
      }

      set({ keywordsProcessing: true, aiError: null })

      try {
        const res = await fetch('/api/ai-batch-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'keywords', chapters, model }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Nøgleordsanalyse fejlede')
        }

        const { batchId } = await res.json()
        const batch: PendingBatch = {
          batchId,
          type: 'keywords',
          prompt: 'Nøgleordsanalyse',
          model,
          submittedAt: new Date().toISOString(),
          chapters: chapters.map((c) => ({ id: c.id, sectionId: c.sectionId, title: c.title })),
        }

        const updated = [...get().pendingBatches, batch]
        savePendingBatches(updated)
        set({ pendingBatches: updated })
      } catch (error: any) {
        set({ aiError: error.message || 'Nøgleordsanalyse fejlede' })
      } finally {
        set({ keywordsProcessing: false })
      }
    },

    // Score analysis — now uses batch API
    analyzeScores: async (question, model = 'claude-haiku-4-5') => {
      const { aiSelectedChapters, book } = get()

      const chapters: { id: string; sectionId: string; title: string; content: string }[] = []
      for (const [sectionId, chapterIds] of aiSelectedChapters) {
        const section = book.sections.find((s) => s.id === sectionId)
        if (!section) continue
        for (const chapterId of chapterIds) {
          const chapter = section.chapters.find((c) => c.id === chapterId)
          if (chapter && chapter.content.trim()) {
            chapters.push({ id: chapter.id, sectionId, title: chapter.title, content: chapter.content })
          }
        }
      }

      if (chapters.length === 0) {
        set({ aiError: 'Ingen kapitler med indhold er valgt.' })
        return
      }

      set({ scoreProcessing: true, aiError: null })

      try {
        const res = await fetch('/api/ai-batch-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'scores', chapters, question, model }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Score-analyse fejlede')
        }

        const { batchId } = await res.json()
        const batch: PendingBatch = {
          batchId,
          type: 'scores',
          prompt: `Score: ${question.substring(0, 150)}`,
          model,
          submittedAt: new Date().toISOString(),
          chapters: chapters.map((c) => ({ id: c.id, sectionId: c.sectionId, title: c.title })),
          question,
        }

        const updated = [...get().pendingBatches, batch]
        savePendingBatches(updated)
        set({ pendingBatches: updated })
      } catch (error: any) {
        set({ aiError: error.message || 'Score-analyse fejlede' })
      } finally {
        set({ scoreProcessing: false })
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
