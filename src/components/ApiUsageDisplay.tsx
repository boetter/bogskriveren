import { useEffect, useState } from 'react'
import { DollarSign, X, Activity, ChevronDown, ChevronUp } from 'lucide-react'
import { useBookStore } from '../store'
import { AI_MODELS } from '../types'

function calculateCost(inputTokens: number, outputTokens: number, modelId: string): number {
  const model = AI_MODELS.find((m) => modelId.includes(m.id.split('-')[1]))
    || AI_MODELS[0] // fallback to Sonnet pricing
  const inputCost = (inputTokens / 1_000_000) * model.costInput
  const outputCost = (outputTokens / 1_000_000) * model.costOutput
  return inputCost + outputCost
}

export default function ApiUsageDisplay() {
  const { apiUsage, loadApiUsage } = useBookStore()
  const [open, setOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    loadApiUsage()
  }, [loadApiUsage])

  if (!apiUsage || apiUsage.calls.length === 0) return null

  // Calculate total cost from individual calls
  let totalCost = 0
  for (const call of apiUsage.calls) {
    totalCost += calculateCost(call.inputTokens, call.outputTokens, call.model)
  }

  const recentCalls = [...apiUsage.calls].reverse().slice(0, 20)

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-stone-500 hover:text-indigo-600 bg-stone-100 rounded-lg transition-colors"
        title="API-forbrug"
      >
        <DollarSign size={13} />
        <span>${totalCost.toFixed(2)}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={20} className="text-indigo-600" />
                <h2 className="text-lg font-semibold text-stone-800">API-forbrug</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stats */}
            <div className="px-6 py-4 border-b border-stone-100">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-stone-50 rounded-xl p-3">
                  <div className="text-xl font-bold text-indigo-600">${totalCost.toFixed(2)}</div>
                  <div className="text-xs text-stone-500 mt-0.5">Samlet forbrug</div>
                </div>
                <div className="bg-stone-50 rounded-xl p-3">
                  <div className="text-xl font-bold text-stone-800">{apiUsage.calls.length}</div>
                  <div className="text-xs text-stone-500 mt-0.5">API-kald</div>
                </div>
                <div className="bg-stone-50 rounded-xl p-3">
                  <div className="text-xl font-bold text-stone-800">
                    {((apiUsage.totalInputTokens + apiUsage.totalOutputTokens) / 1000).toFixed(0)}k
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">Tokens i alt</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
                <span>Input: {apiUsage.totalInputTokens.toLocaleString('da-DK')} tokens</span>
                <span>Output: {apiUsage.totalOutputTokens.toLocaleString('da-DK')} tokens</span>
              </div>
            </div>

            {/* Call history */}
            <div className="flex-1 overflow-y-auto">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full px-6 py-3 flex items-center justify-between text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Seneste kald
                {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showDetails && (
                <div className="px-6 pb-4 space-y-2">
                  {recentCalls.map((call) => {
                    const cost = calculateCost(call.inputTokens, call.outputTokens, call.model)
                    return (
                      <div
                        key={call.id}
                        className="border border-stone-100 rounded-lg p-3 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-stone-700">{call.chapterTitle}</span>
                          <span className="text-indigo-600 font-medium">${cost.toFixed(3)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-stone-400">
                          <span>{new Date(call.timestamp).toLocaleString('da-DK')}</span>
                          <span>{call.model.includes('opus') ? 'Opus' : 'Sonnet'}</span>
                          <span>{call.inputTokens + call.outputTokens} tokens</span>
                        </div>
                        <p className="text-stone-500 mt-1 truncate italic">{call.prompt}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
