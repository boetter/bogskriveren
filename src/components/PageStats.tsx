import type { PageEstimate } from '../types'
import { formatPages } from '../utils/pageEstimation'

interface Props {
  estimate: PageEstimate
  goal: number | null
}

export default function PageStats({ estimate, goal }: Props) {
  const percentage = goal ? Math.min((estimate.pages / goal) * 100, 100) : 0
  const isOver = goal ? estimate.pages > goal : false

  return (
    <div className="inline-flex items-center gap-3 px-3 py-1.5 bg-stone-100 rounded-lg text-xs text-stone-600">
      <span>{estimate.words.toLocaleString('da-DK')} ord</span>
      <span className="text-stone-300">|</span>
      <span>{estimate.characters.toLocaleString('da-DK')} tegn</span>
      <span className="text-stone-300">|</span>
      <span className="font-medium text-indigo-600">~{formatPages(estimate.pages)} sider</span>
      {goal && (
        <>
          <span className="text-stone-300">|</span>
          <span className={isOver ? 'text-amber-600 font-medium' : 'text-emerald-600'}>
            {Math.round(percentage)}% af mål
          </span>
        </>
      )}
    </div>
  )
}
