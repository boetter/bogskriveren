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

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${color}`} title={`LIX ${lix.score} — ${lix.label}`}>
        <BarChart3 size={11} />
        <span className="font-medium">LIX {lix.score}</span>
        {showLabel && <span className="text-stone-400">({lix.label})</span>}
        {goal && (
          <span className={`ml-1 ${Math.abs(lix.score - goal) <= 3 ? 'text-emerald-500' : 'text-amber-500'}`}>
            Mål: {goal}
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
        <span
          className={`text-xs font-medium ${
            Math.abs(lix.score - goal) <= 3 ? 'text-emerald-600' : 'text-amber-600'
          }`}
        >
          Mål: {goal}
        </span>
      )}
    </div>
  )
}
