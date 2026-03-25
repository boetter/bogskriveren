import { useState } from 'react'
import {
  Image,
  Loader2,
  AlertCircle,
  Trash2,
  X,
  Wand2,
} from 'lucide-react'
import { useBookStore } from '../store'
import type { Chapter } from '../types'

interface Props {
  sectionId: string
  chapter: Chapter
}

export default function ImageGenerator({ sectionId, chapter }: Props) {
  const { generateImage, generatingImage, imageError } = useBookStore()
  const [open, setOpen] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-indigo-600 transition-colors"
      >
        <Image size={13} />
        Illustrationer{chapter.images.length > 0 ? ` (${chapter.images.length})` : ''}
      </button>

      {/* Image panel */}
      {open && (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-white border-l border-stone-200 shadow-2xl z-50 flex flex-col">
          <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image size={20} className="text-indigo-600" />
              <h2 className="text-lg font-semibold text-stone-800">Illustrationer</h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Generate new */}
            <div className="bg-stone-50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-stone-700">Generer illustration</h3>
              <p className="text-xs text-stone-500">
                AI genererer et diagram, en model eller en konceptillustration baseret på kapitlets indhold.
              </p>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Valgfri instruktion (fx 'Lav en 2x2 matrix over...')"
                rows={3}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={generatingImage}
              />
              <button
                onClick={() => generateImage(sectionId, chapter.id, customPrompt || undefined)}
                disabled={generatingImage || !chapter.content.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {generatingImage ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Genererer...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Generer illustration
                  </>
                )}
              </button>
              {imageError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">{imageError}</p>
                </div>
              )}
            </div>

            {/* Existing images */}
            {chapter.images.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-stone-700">
                  Genererede illustrationer ({chapter.images.length})
                </h3>
                {[...chapter.images].reverse().map((img) => (
                  <div
                    key={img.id}
                    className="border border-stone-200 rounded-xl overflow-hidden"
                  >
                    <img
                      src={img.imageData}
                      alt="Genereret illustration"
                      className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setViewingImage(img.id)}
                    />
                    <div className="px-4 py-3 bg-stone-50">
                      <p className="text-xs text-stone-500">
                        {new Date(img.createdAt).toLocaleString('da-DK')}
                      </p>
                      <p className="text-xs text-stone-600 mt-1 italic">{img.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {chapter.images.length === 0 && !generatingImage && (
              <div className="text-center py-8">
                <Image size={40} className="text-stone-300 mx-auto mb-3" />
                <p className="text-sm text-stone-400">Ingen illustrationer endnu</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-size image viewer */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-8"
          onClick={() => setViewingImage(null)}
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <X size={24} />
          </button>
          <img
            src={chapter.images.find((i) => i.id === viewingImage)?.imageData}
            alt="Illustration"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
