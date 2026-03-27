export interface ChapterVersion {
  id: string
  content: string
  createdAt: string
  source: 'manual' | 'ai'
  prompt?: string
  model?: string
}

export interface ChapterImage {
  id: string
  imageData: string // base64
  prompt: string
  createdAt: string
}

export const CHAPTER_STATUSES = [
  { id: 'ikke-paabegyndt', label: 'Ikke påbegyndt', color: 'stone' },
  { id: 'udarbejdes', label: 'Ved at blive udarbejdet', color: 'blue' },
  { id: 'sendt-korrektur', label: 'Sendt til korrektur', color: 'amber' },
  { id: 'korrektur-indarbejdet', label: 'Korrektur indarbejdet', color: 'purple' },
  { id: 'klar-til-tryk', label: 'Klar til tryk', color: 'emerald' },
] as const

export type ChapterStatusId = (typeof CHAPTER_STATUSES)[number]['id']

export interface Chapter {
  id: string
  title: string
  content: string // HTML from Tiptap
  goalPages: number | null
  goalLix: number | null
  order: number
  versions: ChapterVersion[]
  images: ChapterImage[]
  status: ChapterStatusId
  keywords: string[]
  score: number | null
  scoreQuestion: string | null
  createdAt: string
  updatedAt: string
}

export interface Section {
  id: string
  title: string
  chapters: Chapter[]
  goalPages: number | null
  goalLix: number | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface Book {
  title: string
  sections: Section[]
  goalPages: number | null
  goalLix: number | null
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

export interface AIAnalysis {
  id: string
  timestamp: string
  prompt: string
  result: string
  model: string
  chapterTitles: string[]
}

export interface PendingBatch {
  batchId: string
  type: 'process' | 'analyze' | 'keywords' | 'scores'
  prompt: string
  model: string
  submittedAt: string
  /** For process/keywords/scores batches: chapters that were submitted */
  chapters?: { id: string; sectionId: string; title: string }[]
  /** For analyze batches: chapter titles */
  chapterTitles?: string[]
  /** For scores batches: the scoring question */
  question?: string
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

export const ANALYSIS_PROMPTS: PresetPrompt[] = [
  {
    id: 'overlap',
    label: 'Find overlap',
    description: 'Identificér indhold der gentages på tværs af kapitler',
    prompt:
      'Analysér disse kapitler grundigt og identificér alle områder hvor indholdet overlapper eller gentages. For hvert overlap: beskriv præcist hvilke afsnit der dækker det samme emne, og foreslå konkret hvordan overlappet kan elimineres — enten ved at fjerne, flytte eller omformulere indhold.',
  },
  {
    id: 'merge',
    label: 'Foreslå sammenlægning',
    description: 'Vurdér om kapitler kan kombineres til færre',
    prompt:
      'Vurdér om disse kapitler kan kombineres til færre kapitler. Kom med et konkret forslag til en ny kapitelstruktur: hvad skal hvert nyt kapitel hedde, hvad skal det indeholde, og hvilke dele fra de nuværende kapitler skal indgå. Begrund hvorfor denne struktur er bedre.',
  },
  {
    id: 'consistency',
    label: 'Tjek konsistens',
    description: 'Find inkonsistenser i terminologi, tone og budskaber',
    prompt:
      'Gennemgå disse kapitler for inkonsistenser. Kig specifikt efter: 1) Terminologi — bruges forskellige ord for det samme koncept? 2) Tone — skifter stilen uhensigtsmæssigt? 3) Budskaber — modsiger kapitlerne hinanden? 4) Fakta — er der tal eller påstande der ikke stemmer overens? List alle fundne problemer med præcise referencer.',
  },
  {
    id: 'flow',
    label: 'Vurdér flow og rækkefølge',
    description: 'Er rækkefølgen logisk? Mangler der overgange?',
    prompt:
      'Vurdér læseflowet på tværs af disse kapitler. Er rækkefølgen logisk? Bygger hvert kapitel naturligt videre på det foregående? Er der manglende overgange eller begrebsspring? Foreslå en optimal rækkefølge og beskriv hvilke overgange der bør tilføjes.',
  },
  {
    id: 'gaps',
    label: 'Identificér mangler',
    description: 'Find emner der mangler at blive dækket',
    prompt:
      'Analysér disse kapitler og identificér emner, aspekter eller perspektiver der mangler. Hvad ville en læser forvente at finde, som ikke er med? Er der huller i argumentationen? Foreslå konkret hvilke nye afsnit eller kapitler der bør tilføjes, og hvor de bør placeres.',
  },
]

export const AI_MODELS = [
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', costInput: 0.8, costOutput: 4 },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', costInput: 3, costOutput: 15 },
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', costInput: 15, costOutput: 75 },
] as const

export type AIModelId = (typeof AI_MODELS)[number]['id']
