import {
  BookOpen,
  FileText,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { useBookStore } from '../store'
import { estimateSection, estimateChapter, formatPages } from '../utils/pageEstimation'

export default function Sidebar() {
  const { book, activeView, setActiveView, sidebarOpen, toggleSidebar } = useBookStore()

  if (!sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-white border border-stone-200 rounded-lg text-stone-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm"
        title="Vis sidebar"
      >
        <PanelLeft size={20} />
      </button>
    )
  }

  return (
    <aside className="w-72 bg-white border-r border-stone-200 h-full flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-stone-100 flex items-center justify-between">
        <button
          onClick={() => setActiveView({ type: 'overview' })}
          className="flex items-center gap-2 font-semibold text-stone-800 hover:text-indigo-700 transition-colors"
        >
          <BookOpen size={20} className="text-indigo-600" />
          <span className="truncate">{book.title}</span>
        </button>
        <button
          onClick={toggleSidebar}
          className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
          title="Skjul sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* Sections & Chapters */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {book.sections.map((section) => {
          const sectionEst = estimateSection(section)
          const isSectionActive = activeView.sectionId === section.id

          return (
            <div key={section.id}>
              <button
                onClick={() => setActiveView({ type: 'section', sectionId: section.id })}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeView.type === 'section' && isSectionActive
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <ChevronRight
                  size={14}
                  className={`shrink-0 transition-transform ${
                    isSectionActive ? 'rotate-90 text-indigo-500' : 'text-stone-400'
                  }`}
                />
                <span className="truncate flex-1">{section.title}</span>
                <span className="text-xs text-stone-400 shrink-0">
                  {formatPages(sectionEst.pages)}s
                </span>
              </button>

              {/* Show chapters when section is active */}
              {isSectionActive && section.chapters.length > 0 && (
                <div className="ml-5 mt-0.5 space-y-0.5">
                  {section.chapters.map((chapter) => {
                    const chEst = estimateChapter(chapter)
                    const isChapterActive = activeView.chapterId === chapter.id
                    return (
                      <button
                        key={chapter.id}
                        onClick={() =>
                          setActiveView({
                            type: 'chapter',
                            sectionId: section.id,
                            chapterId: chapter.id,
                          })
                        }
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors text-left ${
                          isChapterActive
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                        }`}
                      >
                        <FileText size={13} className="shrink-0" />
                        <span className="truncate flex-1">{chapter.title}</span>
                        <span className="text-xs text-stone-400 shrink-0">
                          {formatPages(chEst.pages)}s
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {book.sections.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-stone-400">
            Ingen sektioner endnu.
            <br />
            Opret din første sektion.
          </div>
        )}
      </nav>
    </aside>
  )
}
