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
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="relative">
        <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1">
          <Sparkles size={12} className="text-indigo-400 shrink-0" />
          <div className="relative">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRun()}
              placeholder="AI-instruktion..."
              className="w-44 px-1.5 py-0.5 text-xs border-none outline-none bg-transparent placeholder-indigo-300 text-stone-800"
              disabled={aiProcessing}
            />
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-indigo-500 transition-colors"
              tabIndex={-1}
            >
              <ChevronDown size={12} />
            </button>
          </div>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as AIModelId)}
            className="text-xs border-none outline-none bg-transparent text-indigo-500 cursor-pointer pr-1"
            disabled={aiProcessing}
          >
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label.replace('Claude ', '').replace(' 4.5', '').replace(' 4.6', '')}
              </option>
            ))}
          </select>
          <button
            onClick={handleRun}
            disabled={!prompt.trim() || aiProcessing}
            className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 shrink-0"
          >
            {aiProcessing ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Sparkles size={11} />
            )}
            Kør
          </button>
        </div>

        {showPresets && (
          <div className="absolute top-full right-0 mt-1 w-72 bg-white border border-stone-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
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
    </div>
  )
}
