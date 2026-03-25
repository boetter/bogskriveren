export interface Chapter {
  id: string
  title: string
  content: string // HTML from Tiptap
  goalPages: number | null
  order: number
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
