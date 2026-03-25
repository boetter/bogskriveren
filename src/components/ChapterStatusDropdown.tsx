import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { CHAPTER_STATUSES } from '../types'
import type { ChapterStatusId } from '../types'

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  stone: { bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
}

interface Props {
  status: ChapterStatusId
  onChange: (status: ChapterStatusId) => void
  size?: 'sm' | 'md'
}

export default function ChapterStatusDropdown({ status, onChange, size = 'sm' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = CHAPTER_STATUSES.find((s) => s.id === status) || CHAPTER_STATUSES[0]
  const colors = STATUS_COLORS[current.color] || STATUS_COLORS.stone

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${colors.bg} ${colors.text} ${
          size === 'sm' ? 'text-xs' : 'text-sm'
        } font-medium hover:opacity-80 transition-opacity`}
      >
        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
        {current.label}
        <ChevronDown size={size === 'sm' ? 12 : 14} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-20 min-w-[220px] overflow-hidden">
          {CHAPTER_STATUSES.map((s) => {
            const c = STATUS_COLORS[s.color] || STATUS_COLORS.stone
            return (
              <button
                key={s.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(s.id)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-stone-50 transition-colors ${
                  s.id === status ? 'bg-stone-50' : ''
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                <span className="text-stone-700">{s.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
