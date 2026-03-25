import { useState } from 'react'
import {
  Plus,
  FileText,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Pencil,
  Check,
  Square,
  CheckSquare,
  History,
} from 'lucide-react'
import { useBookStore } from '../store'
import { estimateChapter, estimateSection, formatPages } from '../utils/pageEstimation'
import ProgressBar from './ProgressBar'
import GoalEditor from './GoalEditor'
import type { Section } from '../types'

interface Props {
  section: Section
}

export default function SectionView({ section }: Props) {
  const {
    addChapter,
    deleteChapter,
    updateChapterTitle,
    moveChapterUp,
    moveChapterDown,
    setActiveView,
    setSectionGoal,
    aiSelectionMode,
    aiSelectedChapters,
    toggleChapterSelection,
    selectAllInSection,
    deselectAllInSection,
  } = useBookStore()

  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const sectionEstimate = estimateSection(section)

  const handleAddChapter = () => {
    if (!newChapterTitle.trim()) return
    addChapter(section.id, newChapterTitle.trim())
    setNewChapterTitle('')
  }

  const isChapterSelected = (chapterId: string) => {
    return aiSelectedChapters.get(section.id)?.has(chapterId) || false
  }

  const allSelected =
    section.chapters.length > 0 &&
    aiSelectedChapters.get(section.id)?.size === section.chapters.length

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => setActiveView({ type: 'overview' })}
            className="flex items-center gap-2 text-sm text-stone-400 hover:text-indigo-600 transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Bogoversigt
          </button>
          <div className="flex items-center gap-3">
            {aiSelectionMode && section.chapters.length > 0 && (
              <button
                onClick={() =>
                  allSelected ? deselectAllInSection(section.id) : selectAllInSection(section.id)
                }
                className="text-indigo-500 hover:text-indigo-700 transition-colors"
                title={allSelected ? 'Fravælg alle' : 'Vælg alle kapitler'}
              >
                {allSelected ? <CheckSquare size={22} /> : <Square size={22} />}
              </button>
            )}
            <h1 className="text-3xl font-bold text-stone-900">{section.title}</h1>
          </div>
          <div className="flex items-center gap-6 mt-3 text-sm text-stone-500">
            <span>
              {section.chapters.length}{' '}
              {section.chapters.length === 1 ? 'kapitel' : 'kapitler'}
            </span>
            <span>{sectionEstimate.words} ord</span>
            <span className="font-medium text-indigo-600">
              ~{formatPages(sectionEstimate.pages)} sider
            </span>
            <GoalEditor
              currentGoal={section.goalPages}
              onSave={(goal) => setSectionGoal(section.id, goal)}
              label="Sæt sidemål"
            />
          </div>
          {section.goalPages && (
            <div className="mt-4 max-w-md">
              <ProgressBar current={sectionEstimate.pages} goal={section.goalPages} />
            </div>
          )}
        </div>

        {/* Chapters list */}
        <div className="space-y-3 mb-8">
          {section.chapters.map((chapter, idx) => {
            const est = estimateChapter(chapter)
            const selected = isChapterSelected(chapter.id)
            return (
              <div
                key={chapter.id}
                className={`bg-white border rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all group ${
                  selected ? 'border-indigo-400 bg-indigo-50/30 ring-1 ring-indigo-200' : 'border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {aiSelectionMode && (
                    <button
                      onClick={() => toggleChapterSelection(section.id, chapter.id)}
                      className="text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      {selected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  )}

                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveChapterUp(section.id, chapter.id)}
                      disabled={idx === 0}
                      className="text-stone-300 hover:text-stone-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveChapterDown(section.id, chapter.id)}
                      disabled={idx === section.chapters.length - 1}
                      className="text-stone-300 hover:text-stone-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() =>
                      setActiveView({
                        type: 'chapter',
                        sectionId: section.id,
                        chapterId: chapter.id,
                      })
                    }
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-indigo-500" />
                      {editingChapterId === chapter.id ? (
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateChapterTitle(section.id, chapter.id, editingTitle)
                                setEditingChapterId(null)
                              }
                              if (e.key === 'Escape') setEditingChapterId(null)
                            }}
                            className="px-2 py-0.5 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateChapterTitle(section.id, chapter.id, editingTitle)
                              setEditingChapterId(null)
                            }}
                            className="text-emerald-600"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium text-stone-800">{chapter.title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-stone-400">
                      <span>{est.words} ord</span>
                      <span>~{formatPages(est.pages)} sider</span>
                      {chapter.goalPages && (
                        <span
                          className={
                            est.pages > chapter.goalPages ? 'text-amber-500' : 'text-emerald-500'
                          }
                        >
                          Mål: {chapter.goalPages} sider
                        </span>
                      )}
                      {chapter.versions.length > 0 && (
                        <span className="flex items-center gap-1 text-indigo-400">
                          <History size={11} />
                          {chapter.versions.length} vers.
                        </span>
                      )}
                    </div>
                    {chapter.goalPages && (
                      <div className="mt-2 max-w-xs">
                        <ProgressBar
                          current={est.pages}
                          goal={chapter.goalPages}
                          showNumbers={false}
                          size="sm"
                        />
                      </div>
                    )}
                  </button>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingChapterId(chapter.id)
                        setEditingTitle(chapter.title)
                      }}
                      className="p-1.5 text-stone-400 hover:text-indigo-600 rounded transition-colors"
                      title="Omdøb"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Slet "${chapter.title}"?`)) {
                          deleteChapter(section.id, chapter.id)
                        }
                      }}
                      className="p-1.5 text-stone-400 hover:text-red-600 rounded transition-colors"
                      title="Slet kapitel"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add chapter */}
        {!aiSelectionMode && (
          <div className="bg-white border-2 border-dashed border-stone-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
            <div className="flex items-center gap-3">
              <Plus size={18} className="text-indigo-500" />
              <input
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddChapter()}
                placeholder="Nyt kapitel..."
                className="flex-1 bg-transparent outline-none text-stone-700 placeholder-stone-400"
              />
              <button
                onClick={handleAddChapter}
                disabled={!newChapterTitle.trim()}
                className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Tilføj
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
