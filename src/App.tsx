import { useBookStore } from './store'
import Sidebar from './components/Sidebar'
import BookOverview from './components/BookOverview'
import SectionView from './components/SectionView'
import ChapterEditor from './components/ChapterEditor'
import AIPanel from './components/AIPanel'

export default function App() {
  const { book, activeView } = useBookStore()

  const activeSection = activeView.sectionId
    ? book.sections.find((s) => s.id === activeView.sectionId)
    : undefined

  const activeChapter =
    activeSection && activeView.chapterId
      ? activeSection.chapters.find((c) => c.id === activeView.chapterId)
      : undefined

  const renderMainContent = () => {
    if (activeView.type === 'chapter' && activeSection && activeChapter) {
      return <ChapterEditor key={activeChapter.id} section={activeSection} chapter={activeChapter} />
    }
    if (activeView.type === 'section' && activeSection) {
      return <SectionView section={activeSection} />
    }
    return <BookOverview />
  }

  return (
    <div className="h-screen flex bg-stone-50">
      <Sidebar />
      <main className="flex-1 min-w-0">{renderMainContent()}</main>
      <AIPanel />
    </div>
  )
}
