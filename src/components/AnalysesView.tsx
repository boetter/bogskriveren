import { useEffect } from 'react'
import { Search, ArrowLeft, Clock, Cpu, FileText } from 'lucide-react'
import { useBookStore } from '../store'

export default function AnalysesView() {
  const { analyses, loadAnalyses, setActiveView } = useBookStore()

  useEffect(() => {
    loadAnalyses()
  }, [loadAnalyses])

  const sortedAnalyses = [...analyses].reverse()

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => setActiveView({ type: 'overview' })}
            className="flex items-center gap-2 text-sm text-stone-400 hover:text-indigo-600 transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Bogoversigt
          </button>
          <div className="flex items-center gap-3">
            <Search size={28} className="text-indigo-600" />
            <h1 className="text-3xl font-bold text-stone-900">AI-analyser</h1>
          </div>
          <p className="text-sm text-stone-500 mt-2">
            Her kan du se alle AI-analyser af dine kapitler. Analyserne redigerer ikke teksten — de giver indsigt og anbefalinger.
          </p>
        </div>

        {sortedAnalyses.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
            <Search size={40} className="text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-500 mb-2">Ingen analyser endnu</h3>
            <p className="text-sm text-stone-400">
              Vælg kapitler via AI-tilstand og kør en analyse for at få indsigt i din tekst.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                className="bg-white border border-stone-200 rounded-xl overflow-hidden"
              >
                {/* Analysis header */}
                <div className="px-6 py-4 bg-stone-50 border-b border-stone-200">
                  <div className="flex items-center gap-4 text-xs text-stone-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(analysis.timestamp).toLocaleString('da-DK')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Cpu size={12} />
                      {analysis.model.includes('opus') ? 'Opus 4.6' : 'Sonnet 4.6'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {analysis.chapterTitles.map((title, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs"
                      >
                        <FileText size={10} />
                        {title}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-stone-600 italic">{analysis.prompt.substring(0, 150)}...</p>
                </div>

                {/* Analysis result */}
                <div className="px-6 py-5 prose prose-stone prose-sm max-w-none">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: analysis.result
                        .replace(/\n\n/g, '</p><p>')
                        .replace(/\n/g, '<br>')
                        .replace(/^/, '<p>')
                        .replace(/$/, '</p>')
                        .replace(/## (.+?)(?=<br>|<\/p>)/g, '</p><h3>$1</h3><p>')
                        .replace(/# (.+?)(?=<br>|<\/p>)/g, '</p><h2>$1</h2><p>')
                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.+?)\*/g, '<em>$1</em>')
                        .replace(/\[FAKTATJEK\]/g, '<mark>[FAKTATJEK]</mark>'),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
