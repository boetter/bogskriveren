import { BarChart3 } from 'lucide-react'
import type { LixResult } from '../utils/lix'
import { lixColor } from '../utils/lix'

interface Props {
  lix: LixResult
  goal?: number | null
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export default function LixDisplay({ lix, goal, size = 'sm', showLabel = true }: Props) {
  if (lix.words === 0) return null

  const color = lixColor(lix.score, goal)
  const diff = goal ? Math.abs(lix.score - goal) : null
  const isOnTarget = diff !== null && diff <= 3
  const isClose = diff !== null && diff <= 8
  const goalPercent = goal ? Math.max(0, Math.min(100, 100 - (diff! / goal) * 100)) : 0

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${color}`} title={`LIX ${lix.score} — ${lix.label}`}>
        <BarChart3 size={11} />
        <span className="font-medium">LIX {lix.score}</span>
        {showLabel && <span className="text-stone-400">({lix.label})</span>}
        {goal && (
          <span className="inline-flex items-center gap-1 ml-1">
            <span className={`inline-block w-8 h-1.5 rounded-full bg-stone-200 overflow-hidden`}>
              <span
                className={`block h-full rounded-full ${isOnTarget ? 'bg-emerald-500' : isClose ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${goalPercent}%` }}
              />
            </span>
            <span className={isOnTarget ? 'text-emerald-500' : isClose ? 'text-amber-500' : 'text-red-400'}>
              {lix.score > goal ? `+${diff}` : diff === 0 ? '✓' : `-${diff}`}
            </span>
          </span>
        )}
      </span>
    )
  }

  return (
    <div className="inline-flex items-center gap-2">
      <div className={`flex items-center gap-1.5 ${color}`}>
        <BarChart3 size={14} />
        <span className="text-sm font-medium">LIX {lix.score}</span>
      </div>
      {showLabel && (
        <span className="text-xs text-stone-400">({lix.label})</span>
      )}
      {goal && (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 rounded-full bg-stone-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isOnTarget ? 'bg-emerald-500' : isClose ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${goalPercent}%` }}
            />
          </div>
          <span
            className={`text-xs font-medium ${
              isOnTarget ? 'text-emerald-600' : isClose ? 'text-amber-600' : 'text-red-500'
            }`}
          >
            Mål: {goal} ({lix.score > goal ? `+${diff}` : diff === 0 ? '✓' : `-${diff}`})
          </span>
        </div>
      )}
    </div>
  )
}
