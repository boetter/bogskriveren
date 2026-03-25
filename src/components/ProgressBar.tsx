interface ProgressBarProps {
  current: number
  goal: number | null
  label?: string
  showNumbers?: boolean
  size?: 'sm' | 'md'
}

export default function ProgressBar({ current, goal, label, showNumbers = true, size = 'md' }: ProgressBarProps) {
  if (goal === null || goal === 0) return null

  const percentage = Math.min((current / goal) * 100, 100)
  const isOver = current > goal
  const isComplete = percentage >= 95 && !isOver

  const barColor = isOver
    ? 'bg-amber-500'
    : isComplete
      ? 'bg-emerald-500'
      : 'bg-indigo-500'

  const height = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div className="w-full">
      {(label || showNumbers) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className="text-xs font-medium text-stone-500">{label}</span>
          )}
          {showNumbers && (
            <span className={`text-xs font-medium ${isOver ? 'text-amber-600' : 'text-stone-500'}`}>
              {Math.round(current)} / {goal} sider
              {isOver && ` (+${Math.round(current - goal)})`}
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-stone-200 rounded-full ${height} overflow-hidden`}>
        <div
          className={`${barColor} ${height} rounded-full progress-bar`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
