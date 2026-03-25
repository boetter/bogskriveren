import { useState } from 'react'
import { BarChart3, X, Check } from 'lucide-react'

interface Props {
  currentGoal: number | null
  onSave: (goal: number | null) => void
  label: string
}

export default function LixGoalEditor({ currentGoal, onSave, label }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentGoal?.toString() ?? '')

  const handleSave = () => {
    const num = parseInt(value)
    onSave(num > 0 ? num : null)
    setEditing(false)
  }

  const handleClear = () => {
    onSave(null)
    setValue('')
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => {
          setValue(currentGoal?.toString() ?? '')
          setEditing(true)
        }}
        className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-indigo-600 transition-colors"
      >
        <BarChart3 size={13} />
        {currentGoal ? `LIX-mål: ${currentGoal}` : label}
      </button>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <BarChart3 size={13} className="text-indigo-500" />
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') setEditing(false)
        }}
        placeholder="LIX"
        className="w-16 px-1.5 py-0.5 text-xs border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
        autoFocus
        min={1}
        max={100}
      />
      <button onClick={handleSave} className="text-emerald-600 hover:text-emerald-700">
        <Check size={14} />
      </button>
      <button onClick={handleClear} className="text-stone-400 hover:text-stone-600">
        <X size={14} />
      </button>
    </div>
  )
}
