import { useState } from 'react'
import { History, RotateCcw, Eye, X, Sparkles, PenLine } from 'lucide-react'
import { useBookStore } from '../store'
import { computeDiff } from '../utils/diff'
import type { Chapter, ChapterVersion } from '../types'

interface Props {
  sectionId: string
  chapter: Chapter
}

export default function VersionHistory({ sectionId, chapter }: Props) {
  const { restoreVersion } = useBookStore()
  const [open, setOpen] = useState(false)
  const [viewingVersion, setViewingVersion] = useState<ChapterVersion | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  if (chapter.versions.length === 0) return null

  const sortedVersions = [...chapter.versions].reverse()

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-indigo-600 transition-colors"
      >
        <History size={13} />
        {chapter.versions.length} {chapter.versions.length === 1 ? 'version' : 'versioner'}
      </button>

      {/* Version panel */}
      {open && (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-white border-l border-stone-200 shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={20} className="text-indigo-600" />
              <h2 className="text-lg font-semibold text-stone-800">Versionshistorik</h2>
            </div>
            <button
              onClick={() => {
                setOpen(false)
                setViewingVersion(null)
              }}
              className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {viewingVersion ? (
            // Viewing a specific version
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 py-3 bg-stone-50 border-b border-stone-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      {viewingVersion.source === 'ai' ? (
                        <Sparkles size={14} className="text-indigo-500" />
                      ) : (
                        <PenLine size={14} className="text-stone-400" />
                      )}
                      <span className="font-medium text-stone-700">
                        {viewingVersion.source === 'ai' ? 'Før AI-redigering' : 'Manuelt gemt'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      {new Date(viewingVersion.createdAt).toLocaleString('da-DK')}
                    </p>
                    {viewingVersion.prompt && (
                      <p className="text-xs text-stone-500 mt-1 italic truncate max-w-sm">
                        Prompt: {viewingVersion.prompt}
                      </p>
                    )}
                    {viewingVersion.model && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        Model: {viewingVersion.model.includes('opus') ? 'Opus' : 'Sonnet'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        showDiff
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'border-stone-200 text-stone-600 hover:border-indigo-300'
                      }`}
                    >
                      {showDiff ? 'Vis tekst' : 'Vis forskelle'}
                    </button>
                    <button
                      onClick={() => setViewingVersion(null)}
                      className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg text-stone-600 hover:border-stone-300 transition-colors"
                    >
                      Tilbage
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {showDiff ? (
                  <DiffView oldHtml={viewingVersion.content} newHtml={chapter.content} />
                ) : (
                  <div
                    className="prose prose-stone prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: viewingVersion.content }}
                  />
                )}
              </div>

              <div className="px-6 py-4 border-t border-stone-200 bg-stone-50">
                <button
                  onClick={() => {
                    if (confirm('Gendan denne version? Den nuværende tekst gemmes som en version.')) {
                      restoreVersion(sectionId, chapter.id, viewingVersion.id)
                      setViewingVersion(null)
                      setOpen(false)
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <RotateCcw size={16} />
                  Gendan denne version
                </button>
              </div>
            </div>
          ) : (
            // Version list
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="px-2 py-3 mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 mb-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  Nuværende version
                </div>
                <p className="text-xs text-stone-400">Sidst opdateret: {new Date(chapter.updatedAt).toLocaleString('da-DK')}</p>
              </div>

              {sortedVersions.map((version) => (
                <div
                  key={version.id}
                  className="border border-stone-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        {version.source === 'ai' ? (
                          <Sparkles size={14} className="text-indigo-500 shrink-0" />
                        ) : (
                          <PenLine size={14} className="text-stone-400 shrink-0" />
                        )}
                        <span className="font-medium text-stone-700">
                          {version.source === 'ai' ? 'Før AI-redigering' : 'Manuelt gemt'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-1">
                        {new Date(version.createdAt).toLocaleString('da-DK')}
                      </p>
                      {version.prompt && (
                        <p className="text-xs text-stone-500 mt-1 italic truncate">
                          {version.prompt.substring(0, 80)}...
                        </p>
                      )}
                      {version.model && (
                        <p className="text-xs text-stone-400 mt-0.5">
                          Model: {version.model.includes('opus') ? 'Opus' : 'Sonnet'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <button
                        onClick={() => {
                          setViewingVersion(version)
                          setShowDiff(false)
                        }}
                        className="p-1.5 text-stone-400 hover:text-indigo-600 rounded transition-colors"
                        title="Se version"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Gendan denne version? Den nuværende tekst gemmes som en version.')) {
                            restoreVersion(sectionId, chapter.id, version.id)
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-indigo-600 rounded transition-colors"
                        title="Gendan version"
                      >
                        <RotateCcw size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function DiffView({ oldHtml, newHtml }: { oldHtml: string; newHtml: string }) {
  const segments = computeDiff(oldHtml, newHtml)

  return (
    <div className="text-sm leading-relaxed">
      <div className="flex items-center gap-4 mb-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded" />
          Fjernet (gammel)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-emerald-100 border border-emerald-300 rounded" />
          Tilføjet (ny)
        </span>
      </div>
      <div className="whitespace-pre-wrap">
        {segments.map((seg, idx) => {
          if (seg.type === 'equal') {
            return <span key={idx}>{seg.text}</span>
          }
          if (seg.type === 'removed') {
            return (
              <span
                key={idx}
                className="bg-red-100 text-red-800 line-through decoration-red-400"
              >
                {seg.text}
              </span>
            )
          }
          return (
            <span key={idx} className="bg-emerald-100 text-emerald-800">
              {seg.text}
            </span>
          )
        })}
      </div>
    </div>
  )
}
