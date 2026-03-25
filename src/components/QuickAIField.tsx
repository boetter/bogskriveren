import { useState } from 'react'
import { Sparkles, Loader2, ChevronDown } from 'lucide-react'
import { useBookStore } from '../store'
import { PRESET_PROMPTS, AI_MODELS } from '../types'
import type { AIModelId } from '../types'

interface Props {
  sectionId: string
  chapterId: string
}

export default function QuickAIField({ sectionId, chapterId }: Props) {
  const { processChapterWithAi, aiProcessing } = useBookStore()
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState<AIModelId>('claude-sonnet-4-6')
  const [showPresets, setShowPresets] = useState(false)

  const handleRun = async () => {
    if (!prompt.trim() || aiProcessing) return
    await processChapterWithAi(sectionId, chapterId, prompt.trim(), model)
    setPrompt('')
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-100">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={14} className="text-indigo-500" />
        <span className="text-xs font-medium text-indigo-700">Hurtig AI-redigering</span>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRun()}
                placeholder="Skriv instruktion eller vælg preset..."
                className="w-full px-2.5 py-1.5 text-xs border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent pr-7"
                disabled={aiProcessing}
              />
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-stone-400 hover:text-indigo-500 transition-colors"
              >
                <ChevronDown size={14} />
              </button>

              {showPresets && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                  {PRESET_PROMPTS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPrompt(p.prompt)
                        setShowPresets(false)
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 border-b border-stone-100 last:border-0"
                    >
                      <div className="font-medium text-stone-700">{p.label}</div>
                      <div className="text-stone-400 mt-0.5">{p.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <select
              value={model}
              onChange={(e) => setModel(e.target.value as AIModelId)}
              className="px-2 py-1.5 text-xs border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              disabled={aiProcessing}
            >
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={!prompt.trim() || aiProcessing}
          className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
        >
          {aiProcessing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          Kør
        </button>
      </div>
    </div>
  )
}
