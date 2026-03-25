import { useState, useMemo } from 'react'
import {
  Plus,
  BookOpen,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  Check,
  FileText,
  Square,
  CheckSquare,
  Filter,
  X,
} from 'lucide-react'
import { useBookStore } from '../store'
import { estimateBook, estimateSection, estimateChapter, formatPages } from '../utils/pageEstimation'
import { calculateBookLix, calculateSectionLix, calculateChapterLix } from '../utils/lix'
import ProgressBar from './ProgressBar'
import GoalEditor from './GoalEditor'
import LixDisplay from './LixDisplay'
import LixGoalEditor from './LixGoalEditor'
import ExportButton from './ExportButton'
import ChapterStatusDropdown from './ChapterStatusDropdown'
import { CHAPTER_STATUSES } from '../types'
import type { ChapterStatusId } from '../types'

export default function BookOverview() {
  const {
    book,
    addSection,
    deleteSection,
    updateSectionTitle,
    updateBookTitle,
    setBookGoal,
    setBookLixGoal,
    moveSectionUp,
    moveSectionDown,
    setActiveView,
    aiSelectionMode,
    aiSelectedChapters,
    toggleChapterSelection,
    selectAllInSection,
    deselectAllInSection,
    setChapterStatus,
  } = useBookStore()

  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingBookTitle, setEditingBookTitle] = useState(false)
  const [bookTitleDraft, setBookTitleDraft] = useState(book.title)
  const [filterStatus, setFilterStatus] = useState<ChapterStatusId | null>(null)
  const [filterKeyword, setFilterKeyword] = useState<string | null>(null)

  // Collect all unique keywords from all chapters
  const allKeywords = useMemo(() => {
    const kws = new Set<string>()
    for (const s of book.sections) {
      for (const c of s.chapters) {
        for (const kw of c.keywords || []) kws.add(kw)
      }
    }
    return Array.from(kws).sort()
  }, [book])

  const bookEstimate = estimateBook(book)
  const bookLix = calculateBookLix(book)
  const totalChapters = book.sections.reduce((sum, s) => sum + s.chapters.length, 0)

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return
    addSection(newSectionTitle.trim())
    setNewSectionTitle('')
  }

  const isSectionFullySelected = (sectionId: string) => {
    const section = book.sections.find((s) => s.id === sectionId)
    if (!section || section.chapters.length === 0) return false
    const selected = aiSelectedChapters.get(sectionId)
    return selected?.size === section.chapters.length
  }

  const isChapterSelected = (sectionId: string, chapterId: string) => {
    return aiSelectedChapters.get(sectionId)?.has(chapterId) || false
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Book header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen size={28} className="text-indigo-600" />
            {editingBookTitle ? (
              <div className="flex items-center gap-2">
                <input
                  value={bookTitleDraft}
                  onChange={(e) => setBookTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateBookTitle(bookTitleDraft)
                      setEditingBookTitle(false)
                    }
                    if (e.key === 'Escape') setEditingBookTitle(false)
                  }}
                  className="text-3xl font-bold px-2 py-0.5 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    updateBookTitle(bookTitleDraft)
                    setEditingBookTitle(false)
                  }}
                  className="text-emerald-600"
                >
                  <Check size={20} />
                </button>
              </div>
            ) : (
              <h1
                onClick={() => {
                  setBookTitleDraft(book.title)
                  setEditingBookTitle(true)
                }}
                className="text-3xl font-bold text-stone-900 cursor-pointer hover:text-indigo-700 transition-colors"
                title="Klik for at redigere"
              >
                {book.title}
              </h1>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6">
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="text-2xl font-bold text-indigo-600">{book.sections.length}</div>
              <div className="text-xs text-stone-500 mt-1">Sektioner</div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="text-2xl font-bold text-indigo-600">{totalChapters}</div>
              <div className="text-xs text-stone-500 mt-1">Kapitler</div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="text-2xl font-bold text-indigo-600">
                {bookEstimate.words.toLocaleString('da-DK')}
              </div>
              <div className="text-xs text-stone-500 mt-1">Ord</div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="text-2xl font-bold text-indigo-600">
                ~{formatPages(bookEstimate.pages)}
              </div>
              <div className="text-xs text-stone-500 mt-1">Bogsider</div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="text-2xl font-bold text-indigo-600">
                {bookLix.words > 0 ? bookLix.score : '-'}
              </div>
              <div className="text-xs text-stone-500 mt-1">LIX ({bookLix.label})</div>
            </div>
          </div>

          {/* Goals and export */}
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <GoalEditor currentGoal={book.goalPages} onSave={setBookGoal} label="Sæt sidemål" />
            <LixGoalEditor currentGoal={book.goalLix} onSave={setBookLixGoal} label="Sæt LIX-mål" />
            <ExportButton type="book" book={book} />
          </div>
          {book.goalPages && (
            <div className="mt-3 max-w-md">
              <ProgressBar
                current={bookEstimate.pages}
                goal={book.goalPages}
                label="Samlet fremskridt"
              />
            </div>
          )}
        </div>

        {/* Filters */}
        {(allKeywords.length > 0 || book.sections.some((s) => s.chapters.some((c) => c.status && c.status !== 'ikke-paabegyndt'))) && (
          <div className="mb-6 bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter size={14} className="text-stone-400" />
              <span className="text-sm font-medium text-stone-600">Filtrér kapitler</span>
              {(filterStatus || filterKeyword) && (
                <button
                  onClick={() => { setFilterStatus(null); setFilterKeyword(null) }}
                  className="ml-auto text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1"
                >
                  <X size={12} /> Ryd filtre
                </button>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              <select
                value={filterStatus || ''}
                onChange={(e) => setFilterStatus((e.target.value || null) as ChapterStatusId | null)}
                className="px-2.5 py-1.5 text-xs border border-stone-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Alle statusser</option>
                {CHAPTER_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              {allKeywords.length > 0 && (
                <select
                  value={filterKeyword || ''}
                  onChange={(e) => setFilterKeyword(e.target.value || null)}
                  className="px-2.5 py-1.5 text-xs border border-stone-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Alle nøgleord</option>
                  {allKeywords.map((kw) => (
                    <option key={kw} value={kw}>{kw}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Sections */}
        <h2 className="text-lg font-semibold text-stone-700 mb-4">Sektioner</h2>
        <div className="space-y-4 mb-8">
          {book.sections.map((section, idx) => {
            const sectionEst = estimateSection(section)
            const sectionLix = calculateSectionLix(section)
            const allSelected = isSectionFullySelected(section.id)
            return (
              <div
                key={section.id}
                className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    {aiSelectionMode && section.chapters.length > 0 && (
                      <button
                        onClick={() =>
                          allSelected
                            ? deselectAllInSection(section.id)
                            : selectAllInSection(section.id)
                        }
                        className="mt-1 text-indigo-500 hover:text-indigo-700 transition-colors"
                        title={allSelected ? 'Fravælg alle' : 'Vælg alle kapitler'}
                      >
                        {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    )}

                    <div className="flex flex-col gap-0.5 mt-1">
                      <button
                        onClick={() => moveSectionUp(section.id)}
                        disabled={idx === 0}
                        className="text-stone-300 hover:text-stone-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => moveSectionDown(section.id)}
                        disabled={idx === book.sections.length - 1}
                        className="text-stone-300 hover:text-stone-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {editingSectionId === section.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateSectionTitle(section.id, editingTitle)
                                  setEditingSectionId(null)
                                }
                                if (e.key === 'Escape') setEditingSectionId(null)
                              }}
                              className="text-lg font-semibold px-2 py-0.5 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                updateSectionTitle(section.id, editingTitle)
                                setEditingSectionId(null)
                              }}
                              className="text-emerald-600"
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              setActiveView({ type: 'section', sectionId: section.id })
                            }
                            className="text-lg font-semibold text-stone-800 hover:text-indigo-700 transition-colors text-left"
                          >
                            {section.title}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-stone-500 flex-wrap">
                        <span>
                          {section.chapters.length}{' '}
                          {section.chapters.length === 1 ? 'kapitel' : 'kapitler'}
                        </span>
                        <span>{sectionEst.words} ord</span>
                        <span className="font-medium text-indigo-600">
                          ~{formatPages(sectionEst.pages)} sider
                        </span>
                        <LixDisplay lix={sectionLix} goal={section.goalLix} />
                      </div>

                      {section.goalPages && (
                        <div className="mt-3 max-w-xs">
                          <ProgressBar current={sectionEst.pages} goal={section.goalPages} size="sm" />
                        </div>
                      )}

                      {section.chapters.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {section.chapters
                            .filter((ch) => {
                              if (filterStatus && (ch.status || 'ikke-paabegyndt') !== filterStatus) return false
                              if (filterKeyword && !(ch.keywords || []).includes(filterKeyword)) return false
                              return true
                            })
                            .map((ch) => {
                            const chEst = estimateChapter(ch)
                            const chLix = calculateChapterLix(ch)
                            const chSelected = isChapterSelected(section.id, ch.id)
                            return (
                              <div key={ch.id} className="flex items-center gap-2">
                                {aiSelectionMode && (
                                  <button
                                    onClick={() => toggleChapterSelection(section.id, ch.id)}
                                    className="text-indigo-500 hover:text-indigo-700 transition-colors"
                                  >
                                    {chSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                                  </button>
                                )}
                                <div className="flex-1 min-w-0">
                                  <button
                                    onClick={() =>
                                      setActiveView({
                                        type: 'chapter',
                                        sectionId: section.id,
                                        chapterId: ch.id,
                                      })
                                    }
                                    className="flex items-center gap-2 text-sm text-stone-500 hover:text-indigo-600 transition-colors text-left py-0.5 w-full"
                                  >
                                    <FileText size={13} className="shrink-0" />
                                    <span className="truncate">{ch.title}</span>
                                    <span className="text-xs text-stone-400 shrink-0 ml-auto flex items-center gap-2">
                                      {ch.score !== null && (
                                        <span className={`font-medium ${ch.score >= 70 ? 'text-emerald-500' : ch.score >= 40 ? 'text-amber-500' : 'text-red-400'}`}>
                                          {ch.score}
                                        </span>
                                      )}
                                      {chLix.words > 0 && <span>LIX {chLix.score}</span>}
                                      <span>~{formatPages(chEst.pages)} s.</span>
                                    </span>
                                  </button>
                                  <div className="flex items-center gap-1.5 ml-5 flex-wrap">
                                    <ChapterStatusDropdown
                                      status={ch.status || 'ikke-paabegyndt'}
                                      onChange={(s) => setChapterStatus(section.id, ch.id, s)}
                                      size="sm"
                                    />
                                    {(ch.keywords || []).slice(0, 4).map((kw, i) => (
                                      <span key={i} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-500 text-[10px] rounded-full">
                                        {kw}
                                      </span>
                                    ))}
                                    {(ch.keywords || []).length > 4 && (
                                      <span className="text-[10px] text-stone-400">+{ch.keywords.length - 4}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingSectionId(section.id)
                          setEditingTitle(section.title)
                        }}
                        className="p-1.5 text-stone-400 hover:text-indigo-600 rounded transition-colors"
                        title="Omdøb sektion"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Slet "${section.title}" og alle ${section.chapters.length} kapitler?`)) {
                            deleteSection(section.id)
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-600 rounded transition-colors"
                        title="Slet sektion"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {!aiSelectionMode && (
          <div className="bg-white border-2 border-dashed border-stone-200 rounded-xl p-5 hover:border-indigo-300 transition-colors">
            <div className="flex items-center gap-3">
              <Plus size={20} className="text-indigo-500" />
              <input
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                placeholder="Ny sektion..."
                className="flex-1 bg-transparent outline-none text-stone-700 placeholder-stone-400"
              />
              <button
                onClick={handleAddSection}
                disabled={!newSectionTitle.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Tilføj sektion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
