import { useState } from 'react'
import {
  Plus,
  BookOpen,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  Check,
  FileText,
} from 'lucide-react'
import { useBookStore } from '../store'
import { estimateBook, estimateSection, estimateChapter, formatPages } from '../utils/pageEstimation'
import ProgressBar from './ProgressBar'
import GoalEditor from './GoalEditor'

export default function BookOverview() {
  const {
    book,
    addSection,
    deleteSection,
    updateSectionTitle,
    updateBookTitle,
    setBookGoal,
    moveSectionUp,
    moveSectionDown,
    setActiveView,
  } = useBookStore()

  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingBookTitle, setEditingBookTitle] = useState(false)
  const [bookTitleDraft, setBookTitleDraft] = useState(book.title)

  const bookEstimate = estimateBook(book)
  const totalChapters = book.sections.reduce((sum, s) => sum + s.chapters.length, 0)

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return
    addSection(newSectionTitle.trim())
    setNewSectionTitle('')
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
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
          </div>

          {/* Book goal */}
          <div className="mt-4 flex items-center gap-4">
            <GoalEditor
              currentGoal={book.goalPages}
              onSave={setBookGoal}
              label="Sæt sidemål for bogen"
            />
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

        {/* Sections */}
        <h2 className="text-lg font-semibold text-stone-700 mb-4">Sektioner</h2>
        <div className="space-y-4 mb-8">
          {book.sections.map((section, idx) => {
            const sectionEst = estimateSection(section)
            return (
              <div
                key={section.id}
                className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
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

                      <div className="flex items-center gap-4 text-sm text-stone-500">
                        <span>
                          {section.chapters.length}{' '}
                          {section.chapters.length === 1 ? 'kapitel' : 'kapitler'}
                        </span>
                        <span>{sectionEst.words} ord</span>
                        <span className="font-medium text-indigo-600">
                          ~{formatPages(sectionEst.pages)} sider
                        </span>
                      </div>

                      {section.goalPages && (
                        <div className="mt-3 max-w-xs">
                          <ProgressBar
                            current={sectionEst.pages}
                            goal={section.goalPages}
                            size="sm"
                          />
                        </div>
                      )}

                      {/* Chapter preview */}
                      {section.chapters.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {section.chapters.map((ch) => {
                            const chEst = estimateChapter(ch)
                            return (
                              <button
                                key={ch.id}
                                onClick={() =>
                                  setActiveView({
                                    type: 'chapter',
                                    sectionId: section.id,
                                    chapterId: ch.id,
                                  })
                                }
                                className="flex items-center gap-2 text-sm text-stone-500 hover:text-indigo-600 transition-colors w-full text-left py-0.5"
                              >
                                <FileText size={13} className="shrink-0" />
                                <span className="truncate">{ch.title}</span>
                                <span className="text-xs text-stone-400 shrink-0 ml-auto">
                                  ~{formatPages(chEst.pages)} s.
                                </span>
                              </button>
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
                          if (
                            confirm(
                              `Slet "${section.title}" og alle ${section.chapters.length} kapitler?`
                            )
                          ) {
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

        {/* Add section */}
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
      </div>
    </div>
  )
}
