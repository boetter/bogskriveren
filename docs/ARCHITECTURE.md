# Arkitekturdokumentation

## Oversigt

```
  +-------------------------------------------+
  |              Browser (SPA)                 |
  |                                            |
  |  +--------+  +--------+  +-----------+    |
  |  |Sidebar |  | Editor |  | AI Panel  |    |
  |  |        |  | Tiptap |  | Batches   |    |
  |  +---+----+  +---+----+  +-----+-----+    |
  |      |           |             |           |
  |      +-----+-----+-----+------+           |
  |            |             |                 |
  |      +-----v-----+ +----v---------+       |
  |      |  Zustand   | | localStorage |       |
  |      |  Store     | | (offline)    |       |
  |      +-----+------+ +-------------+       |
  |            |                               |
  +------------|-------------------------------+
               |  HTTP (fetch)
  +------------v-------------------------------+
  |         Netlify Functions                   |
  |                                            |
  |  +----------+  +----------+  +----------+ |
  |  |book-save |  |ai-batch- |  |generate- | |
  |  |book-load |  |submit    |  |image     | |
  |  |          |  |status    |  |          | |
  |  +----+-----+  +----+-----+  +----+-----+ |
  |       |             |             |        |
  +-------|-------------|-------------|--------+
          |             |             |
  +-------v---+  +------v------+  +--v--------+
  | Netlify   |  | Anthropic   |  | Google    |
  | Blobs     |  | Batches API |  | Gemini    |
  +-----------+  +-------------+  +-----------+
```

---

## Frontend-arkitektur

### State management (Zustand)

Al applikationstilstand lever i én Zustand-store (`src/store.ts`). Der er ingen props-drilling — komponenter kalder `useBookStore()` direkte.

**Vigtige principper:**
- `updateBook()` er den eneste funktion der ændrer bogdata
- Hver mutation gemmer automatisk til localStorage
- Server-save sker med 1 sekunds debounce
- Pending batches trackes separat i localStorage (`bogskriveren-pending-batches`)

### Routing

Applikationen bruger ikke en router-library. Navigation sker via `activeView` i store:

```typescript
type ActiveView =
  | { type: 'overview' }
  | { type: 'section', sectionId: string }
  | { type: 'chapter', sectionId: string, chapterId: string }
  | { type: 'analyses' }
```

`App.tsx` renderer den korrekte komponent baseret på `activeView.type`.

### Komponenthierarki

```
App
+-- Sidebar
|   +-- ApiUsageDisplay
+-- BookOverview / SectionView / ChapterEditor / AnalysesView
|   +-- ChapterStatusDropdown
|   +-- GoalEditor / LixGoalEditor
|   +-- LixDisplay
|   +-- ProgressBar / PageStats
|   +-- ExportButton
|   +-- VersionHistory
|   +-- ImageGenerator
|   +-- QuickAIField
+-- AIPanel (conditionally shown)
```

---

## Backend-arkitektur

### Netlify Functions

Alle serverless functions er i `netlify/functions/`. De deployes automatisk som AWS Lambda-funktioner via Netlify.

**Hard begrænsning:** ~26-30 sekunder timeout pr. request. Dette er årsagen til batch-arkitekturen.

### AI Batch-mønster

```
  Trin 1: Submit                    Trin 2: Poll
  -------                           -----

  Client                            Client
    |                                 |
    | POST /ai-batch-submit           | POST /ai-batch-status
    |                                 |
    v                                 v
  Netlify Function                  Netlify Function
    |                                 |
    | client.messages.batches         | client.messages.batches
    |   .create(requests)             |   .retrieve(batchId)
    |                                 |
    v                                 v
  Anthropic API                     Anthropic API
    |                                 |
    | { batchId }                     | { status, results[] }
    |                                 |
    v                                 v
  Return batchId                    Parse results
  (< 5 sekunder)                    Return to client
                                    (< 10 sekunder)
```

Batch-typer og deres request-struktur:

| Type | Requests | System prompt | Forventet svar |
|------|----------|---------------|----------------|
| `process` | 1 pr. kapitel | Bogredigerer-instruktion | HTML-formateret tekst |
| `analyze` | 1 total (alle kapitler samlet) | Boganalytiker-instruktion | Fritekst-analyse |
| `keywords` | 1 pr. kapitel | Tematiske nøgleord | JSON-array `["tag1", "tag2"]` |
| `scores` | 1 pr. kapitel | Scoringskriterium | JSON `{"score": 75, "reason": "..."}` |

### Anthropic Batches API

- Brug `client.messages.batches.create({ requests })` til at oprette
- Brug `client.messages.batches.retrieve(batchId)` til at tjekke status
- Brug `client.messages.batches.results(batchId)` til at hente resultater
- `custom_id` skal matche `^[a-zA-Z0-9_-]{1,64}$`
- Format: `{type}--{sectionId}--{chapterId}` (trunkeret til 64 tegn)

### Synkron AI (undtagelse)

`POST /api/ai-selection` bruger direkte `client.messages.create()` fordi:
- Brugermarkeringer er typisk korte (få afsnit)
- Kontekst trunkeres til 3000 tegn
- Med Haiku: <5s, med Sonnet: <15s

### Lagring

**Netlify Blobs** (store: `book-data`):

| Nøgle | Type | Indhold |
|-------|------|---------|
| `book` | JSON | Hele bogobjektet |
| `analyses` | JSON | Array af AIAnalysis |
| `api-usage` | JSON | Anthropic token-forbrug + kaldhistorik |
| `google-usage` | JSON | Billedgenereringstæller |

**localStorage** (browser):

| Nøgle | Indhold |
|-------|---------|
| `bogskriveren-data` | Book-objekt (offline backup) |
| `bogskriveren-pending-batches` | PendingBatch[] (batch-tracking) |

---

## Typesystem

### Datamodel

```
Book
+-- title: string
+-- sections: Section[]
+-- goalPages: number | null
+-- goalLix: number | null
+-- updatedAt: string

Section
+-- id: string (UUID)
+-- title: string
+-- chapters: Chapter[]
+-- goalPages / goalLix
+-- order: number
+-- createdAt / updatedAt

Chapter
+-- id: string (UUID)
+-- title: string
+-- content: string (HTML)
+-- status: ChapterStatusId
+-- keywords: string[]
+-- score: number | null
+-- scoreQuestion: string | null
+-- goalPages / goalLix
+-- versions: ChapterVersion[]
+-- images: ChapterImage[]
+-- order: number
+-- createdAt / updatedAt

ChapterVersion
+-- id: string (UUID)
+-- content: string (HTML)
+-- source: 'manual' | 'ai'
+-- prompt?: string
+-- model?: string
+-- createdAt: string

ChapterImage
+-- id: string (UUID)
+-- imageData: string (base64 data-URI)
+-- prompt: string
+-- createdAt: string
```

### Kapitelstatus-flow

```
  ikke-paabegyndt  -->  udarbejdes  -->  sendt-korrektur
       (graa)          (blaa)            (gul)
                                           |
                                           v
                   klar-til-tryk  <--  korrektur-indarbejdet
                     (groen)            (lilla)
```

### AI-modeller

| Model ID | Label | Input-pris | Output-pris |
|----------|-------|------------|-------------|
| `claude-haiku-4-5` | Haiku (hurtig) | $0.80/M | $4.00/M |
| `claude-sonnet-4-6` | Sonnet | $3.00/M | $15.00/M |
| `claude-opus-4-6` | Opus (bedst) | $15.00/M | $75.00/M |

Priser i DKK beregnes med kursfaktor i `ApiUsageDisplay.tsx`.

---

## Utilities

### LIX-beregning (`src/utils/lix.ts`)

LIX = (antal ord / antal sætninger) + (antal lange ord × 100 / antal ord)

- Lange ord = ord med >6 bogstaver
- Sætningsdelere: `.`, `!`, `?`

| LIX | Kategori |
|-----|----------|
| <25 | Meget let |
| 25-34 | Let |
| 35-44 | Middel |
| 45-54 | Svær |
| >54 | Meget svær |

### Sideestimat (`src/utils/pageEstimation.ts`)

Standard: **250 ord pr. side** (normal bogside).

### Diff-beregning (`src/utils/diff.ts`)

Ord-niveau diff med LCS-algoritme (Longest Common Subsequence).
Begrænset til max 5000 tokens for performance.
Returnerer `DiffSegment[]` med type `equal`, `added` eller `removed`.

### RTF-eksport (`src/utils/rtf-export.ts`)

Konverterer HTML til RTF med:
- Unicode → Windows-1252 mapping for danske tegn (æ, ø, å)
- Korrekt RTF-formatering (bold, italic, headings, lists)
- Download trigger via browser Blob URL

---

## Fejlhåndtering og offline-support

- Frontend prøver altid at gemme til server, men falder tilbage til localStorage
- `serverAvailable` flag tracker om backend er tilgængelig
- UI viser cloud-status (online/offline/saving)
- Pending batches overlever browser-genstart via localStorage
- Ingen retry-mekanisme for mislykkede batches — bruger kan fjerne og oprette ny
