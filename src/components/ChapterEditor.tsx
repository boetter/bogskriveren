import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useCallback, useRef } from 'react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  ArrowLeft,
  FileText,
} from 'lucide-react'
import { useBookStore } from '../store'
import { estimateChapter, formatPages } from '../utils/pageEstimation'
import { calculateChapterLix } from '../utils/lix'
import LixDisplay from './LixDisplay'
import LixGoalEditor from './LixGoalEditor'
import VersionHistory from './VersionHistory'
import ExportButton from './ExportButton'
import ImageGenerator from './ImageGenerator'
import ChapterStatusDropdown from './ChapterStatusDropdown'
import QuickAIField from './QuickAIField'
import type { Chapter, Section } from '../types'

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
      }`}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-stone-200 mx-1" />
}

interface Props {
  section: Section
  chapter: Chapter
}

export default function ChapterEditor({ section, chapter }: Props) {
  const { updateChapterContent, updateChapterTitle, setChapterLixGoal, setChapterStatus, setActiveView, aiProcessing, aiError, aiDebugInfo } =
    useBookStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const debouncedUpdate = useCallback(
    (html: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        updateChapterContent(section.id, chapter.id, html)
      }, 300)
    },
    [section.id, chapter.id, updateChapterContent]
  )

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: 'Begynd at skrive dit kapitel her, eller indsæt tekst fra Word...',
      }),
    ],
    content: chapter.content,
    onUpdate: ({ editor }) => {
      debouncedUpdate(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-stone max-w-none',
      },
    },
  })

  useEffect(() => {
    if (editor && chapter.content !== editor.getHTML()) {
      editor.commands.setContent(chapter.content)
    }
  }, [chapter.id, chapter.content]) // eslint-disable-line react-hooks/exhaustive-deps

  const estimate = estimateChapter(chapter)
  const lix = calculateChapterLix(chapter)
  const iconSize = 16

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setActiveView({ type: 'section', sectionId: section.id })}
            className="text-stone-400 hover:text-indigo-600 transition-colors"
            title="Tilbage til sektion"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-sm text-stone-400">{section.title}</div>
        </div>
        <input
          value={chapter.title}
          onChange={(e) => updateChapterTitle(section.id, chapter.id, e.target.value)}
          className="text-2xl font-bold text-stone-900 bg-transparent border-none outline-none w-full placeholder-stone-300"
          placeholder="Kapiteloverskrift"
        />
        <div className="flex items-center justify-between mt-3 gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-sm text-stone-500 flex-wrap">
            <ChapterStatusDropdown
              status={chapter.status}
              onChange={(s) => setChapterStatus(section.id, chapter.id, s)}
              size="md"
            />
            <span className="flex items-center gap-1.5">
              <FileText size={14} />
              {estimate.words} ord
            </span>
            <span>{estimate.characters} tegn</span>
            <span className="font-medium text-indigo-600">
              ~{formatPages(estimate.pages)} {estimate.pages === 1 ? 'side' : 'sider'}
            </span>
            <LixDisplay lix={lix} goal={chapter.goalLix} size="md" />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <LixGoalEditor
            currentGoal={chapter.goalLix}
            onSave={(lix) => setChapterLixGoal(section.id, chapter.id, lix)}
            label="LIX-mål"
          />
          <VersionHistory sectionId={section.id} chapter={chapter} />
          <ExportButton type="chapter" chapter={chapter} />
          <ImageGenerator sectionId={section.id} chapter={chapter} />
        </div>
        {chapter.keywords.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {chapter.keywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full border border-indigo-100">
                {kw}
              </span>
            ))}
          </div>
        )}
        {chapter.score !== null && (
          <div className="mt-2 inline-flex items-center gap-2 text-xs">
            <span className="text-stone-400">Score:</span>
            <span className={`font-bold ${chapter.score >= 70 ? 'text-emerald-600' : chapter.score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
              {chapter.score}/100
            </span>
            {chapter.scoreQuestion && (
              <span className="text-stone-400 truncate max-w-xs" title={chapter.scoreQuestion}>
                ({chapter.scoreQuestion})
              </span>
            )}
          </div>
        )}
        <div className="mt-3">
          <QuickAIField sectionId={section.id} chapterId={chapter.id} />
        </div>
        {aiError && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">
            {aiError}
            {aiDebugInfo && (
              <details className="mt-1">
                <summary className="cursor-pointer text-red-400">Debug info</summary>
                <pre className="mt-1 text-[10px] text-red-400 overflow-x-auto">{JSON.stringify(aiDebugInfo, null, 2)}</pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      {editor && (
        <div className="border-b border-stone-200 bg-white px-6 py-2 flex flex-wrap items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Fed (Ctrl+B)"
          >
            <Bold size={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Kursiv (Ctrl+I)"
          >
            <Italic size={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Understreget (Ctrl+U)"
          >
            <UnderlineIcon size={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Gennemstreget"
          >
            <Strikethrough size={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive('highlight')}
            title="Markér"
          >
            <Highlighter size={iconSize} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Overskrift 1"
          >
            <Heading1 size={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Overskrift 2"
          >
            <Heading2 size={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Overskrift 3"
          >
            <Heading3 size={iconSize} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Punktliste"
          >
            <List size={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Nummereret liste"
          >
            <ListOrdered size={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Citat"
          >
            <Quote size={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Vandret linje"
          >
            <Minus size={iconSize} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title="Venstrejustér"
          >
            <AlignLeft size={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title="Centrér"
          >
            <AlignCenter size={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title="Højrejustér"
          >
            <AlignRight size={iconSize} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Fortryd (Ctrl+Z)">
            <Undo size={iconSize} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            title="Annuller fortryd (Ctrl+Shift+Z)"
          >
            <Redo size={iconSize} />
          </ToolbarButton>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto py-8 px-8">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
