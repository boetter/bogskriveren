import { useEffect, useState } from 'react'
import { X, Activity, ChevronDown, ChevronUp, Coins } from 'lucide-react'
import { useBookStore } from '../store'
import { AI_MODELS } from '../types'

const USD_TO_DKK = 7.0
const GOOGLE_IMAGE_COST_DKK = 0.30 // ~$0.04 per image

function calculateCostDkk(inputTokens: number, outputTokens: number, modelId: string): number {
  const model = AI_MODELS.find((m) => modelId.includes(m.id.split('-')[1]))
    || AI_MODELS[0]
  const inputCost = (inputTokens / 1_000_000) * model.costInput
  const outputCost = (outputTokens / 1_000_000) * model.costOutput
  return (inputCost + outputCost) * USD_TO_DKK
}

function formatDkk(amount: number): string {
  return amount.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr.'
}

export default function ApiUsageDisplay() {
  const { apiUsage, loadApiUsage } = useBookStore()
  const [open, setOpen] = useState(false)
  const [showAnthropicDetails, setShowAnthropicDetails] = useState(false)
  const [googleUsage, setGoogleUsage] = useState<{ imageCount: number; calls: { id: string; timestamp: string; chapterTitle: string }[] } | null>(null)

  useEffect(() => {
    loadApiUsage()
    fetch('/api/google-usage').then((r) => r.ok ? r.json() : null).then((d) => d && setGoogleUsage(d)).catch(() => {})
  }, [loadApiUsage])

  const hasData = (apiUsage && apiUsage.calls.length > 0) || (googleUsage && googleUsage.imageCount > 0)
  if (!hasData) return null

  let anthropicTotalDkk = 0
  for (const call of apiUsage?.calls || []) {
    anthropicTotalDkk += calculateCostDkk(call.inputTokens, call.outputTokens, call.model)
  }

  const googleTotalDkk = (googleUsage?.imageCount || 0) * GOOGLE_IMAGE_COST_DKK
  const totalDkk = anthropicTotalDkk + googleTotalDkk

  const recentAnthropicCalls = [...(apiUsage?.calls || [])].reverse().slice(0, 20)

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-stone-500 hover:text-indigo-600 bg-stone-100 rounded-lg transition-colors"
        title="API-forbrug"
      >
        <Coins size={13} />
        <span>{formatDkk(totalDkk)}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[650px] flex flex-col">
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

            <div className="flex-1 overflow-y-auto">
              {/* Anthropic section */}
              {apiUsage && apiUsage.calls.length > 0 && (
                <div className="px-6 py-4 border-b border-stone-100">
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Anthropic (Claude)</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-stone-50 rounded-xl p-3">
                      <div className="text-lg font-bold text-indigo-600">{formatDkk(anthropicTotalDkk)}</div>
                      <div className="text-xs text-stone-500 mt-0.5">Samlet forbrug</div>
                    </div>
                    <div className="bg-stone-50 rounded-xl p-3">
                      <div className="text-lg font-bold text-stone-800">{apiUsage.calls.length}</div>
                      <div className="text-xs text-stone-500 mt-0.5">API-kald</div>
                    </div>
                    <div className="bg-stone-50 rounded-xl p-3">
                      <div className="text-lg font-bold text-stone-800">
                        {((apiUsage.totalInputTokens + apiUsage.totalOutputTokens) / 1000).toFixed(0)}k
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">Tokens i alt</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-stone-400">
                    <span>Input: {apiUsage.totalInputTokens.toLocaleString('da-DK')} tokens</span>
                    <span>Output: {apiUsage.totalOutputTokens.toLocaleString('da-DK')} tokens</span>
                  </div>

                  <button
                    onClick={() => setShowAnthropicDetails(!showAnthropicDetails)}
                    className="mt-3 w-full flex items-center justify-between text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors"
                  >
                    Seneste kald
                    {showAnthropicDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showAnthropicDetails && (
                    <div className="mt-2 space-y-1.5">
                      {recentAnthropicCalls.map((call) => {
                        const cost = calculateCostDkk(call.inputTokens, call.outputTokens, call.model)
                        return (
                          <div key={call.id} className="border border-stone-100 rounded-lg p-2.5 text-xs">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-medium text-stone-700 truncate flex-1">{call.chapterTitle}</span>
                              <span className="text-indigo-600 font-medium shrink-0 ml-2">{formatDkk(cost)}</span>
                            </div>
                            <div className="flex items-center gap-3 text-stone-400">
                              <span>{new Date(call.timestamp).toLocaleString('da-DK')}</span>
                              <span>{call.model.split('-').slice(-2).join(' ')}</span>
                              <span>{call.inputTokens + call.outputTokens} tokens</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Google section */}
              {googleUsage && googleUsage.imageCount > 0 && (
                <div className="px-6 py-4 border-b border-stone-100">
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Google (Gemini Imagen)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-stone-50 rounded-xl p-3">
                      <div className="text-lg font-bold text-emerald-600">{formatDkk(googleTotalDkk)}</div>
                      <div className="text-xs text-stone-500 mt-0.5">Samlet forbrug</div>
                    </div>
                    <div className="bg-stone-50 rounded-xl p-3">
                      <div className="text-lg font-bold text-stone-800">{googleUsage.imageCount}</div>
                      <div className="text-xs text-stone-500 mt-0.5">Billeder genereret</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-stone-400">
                    Estimeret pris: {GOOGLE_IMAGE_COST_DKK.toFixed(2).replace('.', ',')} kr. pr. billede
                  </div>
                </div>
              )}

              {/* Total */}
              {(apiUsage?.calls.length || 0) > 0 && (googleUsage?.imageCount || 0) > 0 && (
                <div className="px-6 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-stone-700">Total</span>
                    <span className="text-lg font-bold text-indigo-700">{formatDkk(totalDkk)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
