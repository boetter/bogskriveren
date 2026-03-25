import { useState } from 'react'
import {
  Sparkles,
  X,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react'
import { useBookStore } from '../store'
import { PRESET_PROMPTS, AI_MODELS } from '../types'
import type { AIModelId } from '../types'

export default function AIPanel() {
  const {
    showAiPanel,
    setShowAiPanel,
    aiSelectedChapters,
    book,
    aiProcessing,
    aiProgress,
    aiError,
    processWithAi,
    clearAiSelection,
    toggleAiSelectionMode,
    getSelectedChapterCount,
  } = useBookStore()

  const [prompt, setPrompt] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [model, setModel] = useState<AIModelId>('claude-sonnet-4-20250514')
  const [showPresets, setShowPresets] = useState(false)

  if (!showAiPanel) return null

  const selectedCount = getSelectedChapterCount()

  const handlePresetSelect = (presetId: string) => {
    const preset = PRESET_PROMPTS.find((p) => p.id === presetId)
    if (preset) {
      setPrompt(preset.prompt)
      setSelectedPreset(presetId)
    }
    setShowPresets(false)
  }

  const handleProcess = async () => {
    if (!prompt.trim() || selectedCount === 0) return
    await processWithAi(prompt.trim(), model)
  }

  const handleClose = () => {
    if (aiProcessing) return
    setShowAiPanel(false)
    clearAiSelection()
    toggleAiSelectionMode()
  }

  // Build list of selected chapters for display
  const selectedItems: { sectionTitle: string; chapterTitle: string }[] = []
  for (const [sectionId, chapterIds] of aiSelectedChapters) {
    const section = book.sections.find((s) => s.id === sectionId)
    if (!section) continue
    for (const chapterId of chapterIds) {
      const chapter = section.chapters.find((c) => c.id === chapterId)
      if (chapter) {
        selectedItems.push({ sectionTitle: section.title, chapterTitle: chapter.title })
      }
    }
  }

  const isComplete = aiProgress && aiProgress.current === aiProgress.total && !aiProcessing

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white border-l border-stone-200 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-indigo-600" />
          <h2 className="text-lg font-semibold text-stone-800">AI-behandling</h2>
        </div>
        <button
          onClick={handleClose}
          disabled={aiProcessing}
          className="p-1.5 text-stone-400 hover:text-stone-600 disabled:opacity-50 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Selected chapters */}
        <div>
          <h3 className="text-sm font-medium text-stone-700 mb-2">
            Valgte kapitler ({selectedCount})
          </h3>
          <div className="bg-stone-50 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
            {selectedItems.length === 0 ? (
              <p className="text-sm text-stone-400 italic">Ingen kapitler valgt</p>
            ) : (
              selectedItems.map((item, idx) => (
                <div key={idx} className="text-sm">
                  <span className="text-stone-400">{item.sectionTitle}</span>
                  <span className="text-stone-300 mx-1.5">/</span>
                  <span className="text-stone-700">{item.chapterTitle}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preset prompts */}
        <div>
          <h3 className="text-sm font-medium text-stone-700 mb-2">Foruddefinerede prompts</h3>
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-left hover:border-indigo-300 transition-colors"
            >
              <span className={selectedPreset ? 'text-stone-800' : 'text-stone-400'}>
                {selectedPreset
                  ? PRESET_PROMPTS.find((p) => p.id === selectedPreset)?.label
                  : 'Vælg en foruddefineret prompt...'}
              </span>
              <ChevronDown size={16} className="text-stone-400" />
            </button>
            {showPresets && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-10 overflow-hidden">
                {PRESET_PROMPTS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset.id)}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-stone-100 last:border-0"
                  >
                    <div className="text-sm font-medium text-stone-800">{preset.label}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{preset.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Custom prompt */}
        <div>
          <h3 className="text-sm font-medium text-stone-700 mb-2">Prompt</h3>
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value)
              setSelectedPreset(null)
            }}
            placeholder="Skriv din instruktion til AI'en her..."
            rows={5}
            className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={aiProcessing}
          />
        </div>

        {/* Model selector */}
        <div>
          <h3 className="text-sm font-medium text-stone-700 mb-2">Model</h3>
          <div className="grid grid-cols-2 gap-2">
            {AI_MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                disabled={aiProcessing}
                className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  model === m.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                    : 'border-stone-200 text-stone-600 hover:border-indigo-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progress */}
        {aiProgress && (
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {aiProcessing ? (
                <Loader2 size={16} className="text-indigo-600 animate-spin" />
              ) : isComplete ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : null}
              <span className="text-sm font-medium text-stone-700">
                {aiProcessing
                  ? `Behandler: ${aiProgress.currentChapterTitle}`
                  : isComplete
                    ? 'Færdig!'
                    : ''}
              </span>
            </div>
            <div className="w-full bg-indigo-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(aiProgress.current / aiProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-stone-500 mt-1.5">
              {aiProgress.current} af {aiProgress.total} kapitler
            </p>
          </div>
        )}

        {/* Error */}
        {aiError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{aiError}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-stone-200 bg-stone-50">
        <button
          onClick={handleProcess}
          disabled={aiProcessing || !prompt.trim() || selectedCount === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {aiProcessing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Behandler...
            </>
          ) : (
            <>
              <Play size={18} />
              Kør AI-behandling ({selectedCount} {selectedCount === 1 ? 'kapitel' : 'kapitler'})
            </>
          )}
        </button>
      </div>
    </div>
  )
}
