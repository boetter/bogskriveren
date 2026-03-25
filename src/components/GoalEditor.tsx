import { useState } from 'react'
import { Target, X, Check } from 'lucide-react'

interface GoalEditorProps {
  currentGoal: number | null
  onSave: (goal: number | null) => void
  label: string
}

export default function GoalEditor({ currentGoal, onSave, label }: GoalEditorProps) {
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
        <Target size={13} />
        {currentGoal ? `${currentGoal} sider` : `${label}`}
      </button>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <Target size={13} className="text-indigo-500" />
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') setEditing(false)
        }}
        placeholder="Sider"
        className="w-16 px-1.5 py-0.5 text-xs border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
        autoFocus
        min={1}
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
