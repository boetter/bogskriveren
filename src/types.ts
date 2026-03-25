export interface ChapterVersion {
  id: string
  content: string
  createdAt: string
  source: 'manual' | 'ai'
  prompt?: string
  model?: string
}

export interface Chapter {
  id: string
  title: string
  content: string // HTML from Tiptap
  goalPages: number | null
  order: number
  versions: ChapterVersion[]
  createdAt: string
  updatedAt: string
}

export interface Section {
  id: string
  title: string
  chapters: Chapter[]
  goalPages: number | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface Book {
  title: string
  sections: Section[]
  goalPages: number | null
  updatedAt: string
}

export interface PageEstimate {
  words: number
  characters: number
  pages: number
}

export interface ApiUsage {
  totalInputTokens: number
  totalOutputTokens: number
  calls: ApiCall[]
}

export interface ApiCall {
  id: string
  timestamp: string
  model: string
  inputTokens: number
  outputTokens: number
  chapterTitle: string
  prompt: string
}

export interface PresetPrompt {
  id: string
  label: string
  description: string
  prompt: string
}

export const PRESET_PROMPTS: PresetPrompt[] = [
  {
    id: 'shorten',
    label: 'Forkort teksten',
    description: 'Halvér længden, bevar de vigtigste pointer',
    prompt:
      'Forkort teksten til cirka halvdelen af den nuværende længde. Bevar de vigtigste pointer og budskaber, men fjern gentagelser, unødvendige detaljer og fyldord. Bevar den originale tone og stil.',
  },
  {
    id: 'expand',
    label: 'Udvid og uddyb',
    description: 'Tilføj flere detaljer, eksempler og forklaringer',
    prompt:
      'Udvid teksten med flere detaljer, eksempler og forklaringer. Gør indholdet rigere og mere dybdegående, men bevar den eksisterende struktur og tone. Tilføj gerne konkrete eksempler der understøtter pointerne.',
  },
  {
    id: 'simplify',
    label: 'Forenkl sproget',
    description: 'Gør teksten nemmere at forstå for en bred målgruppe',
    prompt:
      'Omskriv teksten så den er nemmere at forstå. Brug kortere sætninger, enklere ord og klarere formuleringer. Teksten skal kunne forstås af en bred målgruppe uden faglig baggrund. Bevar indholdet og budskaberne.',
  },
  {
    id: 'factcheck',
    label: 'Faktatjek og præcisér',
    description: 'Markér tvivlsomme fakta og foreslå præciseringer',
    prompt:
      'Gennemgå teksten kritisk for faktuelle udsagn. Markér eventuelle påstande der bør verificeres med [FAKTATJEK] foran den relevante sætning. Foreslå mere præcise formuleringer hvor det er relevant. Bevar resten af teksten uændret.',
  },
  {
    id: 'style',
    label: 'Forbedr stil og flow',
    description: 'Bedre overgange, mere varieret sprog, mere engagerende',
    prompt:
      'Forbedr tekstens stil, rytme og flow. Sørg for bedre overgange mellem afsnit, mere varieret sætningsstruktur og et mere engagerende sprog. Bevar indholdet og den overordnede struktur, men gør teksten mere behagelig at læse.',
  },
]

export const AI_MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', costInput: 3, costOutput: 15 },
  { id: 'claude-opus-4-20250514', label: 'Claude Opus 4', costInput: 15, costOutput: 75 },
] as const

export type AIModelId = (typeof AI_MODELS)[number]['id']
