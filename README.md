```
    ____                   __         _
   / __ )____  ____ ______/ /_  _____(_)   _____  ________  ____
  / __  / __ \/ __ `/ ___/ //_// ___/ / | / / _ \/ ___/ _ \/ __ \
 / /_/ / /_/ / /_/ (__  ) ,<  / /  / /| |/ /  __/ /  /  __/ / / /
/_____/\____/\__, /____/_/|_|/ /  /_/ |___/\___/_/   \___/_/ /_/
            /____/          /_/

         +-------------------------------------------------+
         |  AI-drevet bogskrivningsvaerktoj paa dansk      |
         |  Strukturer, redigér og analysér din bog        |
         |  med hjaelp fra Claude AI                       |
         +-------------------------------------------------+
```

# Bogskriveren

**Bogskriveren** er et dansk bogskrivningsværktøj bygget til forfattere, der vil strukturere, redigere og analysere deres manuskripter med hjælp fra AI.

Applikationen er en webbaseret single-page app med en Tiptap rich text-editor, AI-drevet batchbehandling via Anthropic Claude API, og serverless backend på Netlify.

---

## Funktioner

```
  +------------------+     +------------------+     +------------------+
  |  Strukturering   |     |   AI-redigering   |     |    Analyse       |
  |                  |     |                   |     |                  |
  |  Bog             |     |  Batch-redigering |     |  LIX-laesbarhed  |
  |   +-- Sektioner  |     |  5 presets        |     |  Sideestimat     |
  |       +-- Kap.   |     |  3 modeller       |     |  Noegleord       |
  |                  |     |  Version history  |     |  Scoring 0-100   |
  +------------------+     +------------------+     +------------------+
          |                        |                        |
          +------------------------+------------------------+
                                   |
                    +------------------------------+
                    |      Netlify Functions        |
                    |   Anthropic Batches API       |
                    |   Google Gemini (billeder)    |
                    |   Netlify Blobs (storage)     |
                    +------------------------------+
```

### Bogstruktur
- Hierarkisk organisering: **Bog > Sektioner > Kapitler**
- Flyt kapitler og sektioner op/ned
- Inline redigering af titler
- Statusflow med 5 trin (ikke påbegyndt → klar til tryk)

### Rich Text-editor
- WYSIWYG Tiptap-editor med fuld formatering
- Fed, kursiv, understregning, gennemstregning, markering
- Overskrifter (H1–H3), lister, citater, vandrette linjer
- Tekstjustering (venstre, center, højre)
- Fortryd/annuller fortryd
- **Inline AI-redigering**: Markér tekst → skriv instruktion → AI omskriver kun markeringen

### AI-funktioner
- **Batch-redigering** af flere kapitler (fire-and-forget)
- **5 redigeringspresets**: Forkort, Udvid, Forenkl, Faktatjek, Forbedr stil
- **5 analysepresets**: Find overlap, Foreslå sammenlægning, Tjek konsistens, Vurdér flow, Identificér mangler
- **Fritekst-prompt** til egne instruktioner
- **Modelvalg**: Claude Haiku 4.5, Sonnet 4.6, Opus 4.6
- **Versionhistorik** med diff-visning (før/efter AI-redigering)
- **Nøgleordsudtræk** med brede tematiske tags
- **Scoring** (0–100) på brugerdefinerede kriterier

### Analyseredskaber
- **LIX-score** (dansk læsbarhedsindex)
- **Sideestimat** (250 ord/side)
- **Filtrering** efter status og nøgleord
- **API-forbrugsoversigt** i DKK (Anthropic + Google)

### Eksport
- **RTF-download** af kapitel, sektion eller hele bogen
- Korrekt Unicode-håndtering for Windows-kompatibilitet

### Billedgenerering
- Generér illustrationer via **Google Gemini**
- Automatiske diagrammer/konceptmodeller
- Brugerdefineret prompt-override
- Galleri med flere billeder pr. kapitel

---

## Teknisk stak

```
  Frontend                    Backend                     Storage
  --------                    -------                     -------
  React 18                    Netlify Functions            Netlify Blobs
  TypeScript 5.7              Anthropic Batches API        localStorage
  Zustand 5                   Google Gemini API
  Tiptap 2.11                 Node.js (nft bundler)
  Tailwind CSS 3.4
  Vite 6
  Lucide React
```

---

## Opsætning

### Forudsætninger
- Node.js 18+
- npm
- Netlify CLI (valgfri, til lokal udvikling)

### Installation

```bash
git clone <repo-url>
cd bogskriveren
npm install
```

### Miljøvariabler

Opret en `.env`-fil eller konfigurér i Netlify Dashboard:

```env
ANTHROPIC_API_KEY=sk-ant-...    # Påkrævet — Claude API-nøgle
GOOGLE_API_KEY=AIza...          # Valgfri — til billedgenerering med Gemini
```

### Lokal udvikling

```bash
# Med Vite (kun frontend)
npm run dev

# Med Netlify CLI (frontend + serverless functions)
netlify dev
```

### Build

```bash
npm run build      # TypeScript-tjek + Vite-build → dist/
```

### Deploy

Projektet deployes automatisk til Netlify ved push til `main`-branchen.

---

## Projektstruktur

```
bogskriveren/
+-- src/
|   +-- main.tsx                 # App-entrypoint
|   +-- App.tsx                  # Routing + layout
|   +-- store.ts                 # Zustand state management
|   +-- types.ts                 # TypeScript-typer + konstanter
|   +-- components/
|   |   +-- Sidebar.tsx          # Navigation + bogstruktur
|   |   +-- BookOverview.tsx     # Overblik med sektioner/kapitler
|   |   +-- SectionView.tsx      # Sektionsvisning
|   |   +-- ChapterEditor.tsx    # Tiptap-editor + toolbar
|   |   +-- QuickAIField.tsx     # Inline AI-felt pr. kapitel
|   |   +-- AIPanel.tsx          # AI batch-panel (højre sidebar)
|   |   +-- AnalysesView.tsx     # Gemte AI-analyser
|   |   +-- VersionHistory.tsx   # Versionhistorik + diff
|   |   +-- ImageGenerator.tsx   # Billedgenerering (Gemini)
|   |   +-- ApiUsageDisplay.tsx  # Forbrugsoversigt (DKK)
|   |   +-- ChapterStatusDropdown.tsx
|   |   +-- ExportButton.tsx     # RTF-eksport
|   |   +-- GoalEditor.tsx       # Sidemål
|   |   +-- LixGoalEditor.tsx    # LIX-mål
|   |   +-- LixDisplay.tsx       # LIX-visning
|   |   +-- ProgressBar.tsx      # Fremskridtslinje
|   |   +-- PageStats.tsx        # Sidestatistik
|   +-- utils/
|       +-- lix.ts               # LIX-beregning
|       +-- pageEstimation.ts    # Ord → sider
|       +-- diff.ts              # Ord-niveau diff (LCS)
|       +-- rtf-export.ts        # HTML → RTF konvertering
|       +-- sse.ts               # SSE event-parsing
+-- netlify/
|   +-- functions/
|       +-- book-save.ts         # POST /api/book-save
|       +-- book-load.ts         # GET  /api/book-load
|       +-- ai-batch-submit.ts   # POST /api/ai-batch-submit
|       +-- ai-batch-status.ts   # POST /api/ai-batch-status
|       +-- ai-selection.ts      # POST /api/ai-selection
|       +-- ai-process.ts        # POST /api/ai-process (legacy)
|       +-- ai-analyze.ts        # POST /api/ai-analyze (legacy)
|       +-- ai-keywords.ts       # POST /api/ai-keywords (legacy)
|       +-- ai-score.ts          # POST /api/ai-score (legacy)
|       +-- generate-image.ts    # POST /api/generate-image
|       +-- load-analyses.ts     # GET  /api/load-analyses
|       +-- api-usage.ts         # GET  /api/api-usage
|       +-- google-usage.ts      # GET  /api/google-usage
|       +-- utils/
|           +-- html-to-text.ts  # HTML → plaintext
+-- netlify.toml                 # Netlify-konfiguration
+-- package.json
+-- tsconfig.json
+-- vite.config.ts
+-- tailwind.config.js
+-- postcss.config.js
```

---

## API-endpoints

Se [docs/API.md](docs/API.md) for fuld API-dokumentation.

| Endpoint | Metode | Beskrivelse |
|----------|--------|-------------|
| `/api/book-save` | POST | Gem bog til Netlify Blobs |
| `/api/book-load` | GET | Hent bog fra Netlify Blobs |
| `/api/ai-batch-submit` | POST | Opret AI-batch (redigering/analyse/nøgleord/scores) |
| `/api/ai-batch-status` | POST | Tjek batch-status og hent resultater |
| `/api/ai-selection` | POST | AI-omskrivning af markeret tekst |
| `/api/generate-image` | POST | Generér illustration via Gemini |
| `/api/load-analyses` | GET | Hent gemte analyser |
| `/api/api-usage` | GET | Hent Anthropic API-forbrug |
| `/api/google-usage` | GET | Hent Google API-forbrug |

---

## Dataflow

```
  +-------------+    debounce 1s    +----------------+
  | localStorage |<----- set ------>| Zustand Store  |
  |  (offline)   |                  |   (in-memory)  |
  +------+------+                  +-------+--------+
         |                                 |
         |    POST /api/book-save          |
         +-------------------------------->+
                                           |
                              +------------v-----------+
                              |    Netlify Blobs       |
                              |  (persistent storage)  |
                              +------------------------+
```

```
  AI Batch-flow:

  1. Bruger vaelger kapitler + prompt
  2. submitBatch() -> POST /api/ai-batch-submit
  3. Serverless function opretter Anthropic Batch
  4. Returnerer batchId (fire-and-forget)
  5. batchId gemmes i localStorage
  6. Bruger klikker "Tjek batches"
  7. checkBatches() -> POST /api/ai-batch-status
  8. Naar status='ended': resultater anvendes paa kapitler
```

---

## Vedligeholdelse

Se [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for dybdegående teknisk dokumentation og [CLAUDE.md](CLAUDE.md) for AI-assisteret udvikling.

### Tilføj ny AI-preset

Redigér `PRESET_PROMPTS` eller `ANALYSIS_PROMPTS` i `src/types.ts`:

```typescript
export const PRESET_PROMPTS: PresetPrompt[] = [
  {
    id: 'min-preset',
    label: 'Min preset',
    description: 'Kort beskrivelse',
    prompt: 'Den fulde instruktion til AI...',
  },
  // ...
]
```

### Tilføj ny kapitelstatus

Redigér `CHAPTER_STATUSES` i `src/types.ts` og tilføj farve/label.

### Skift AI-model priser

Opdatér `AI_MODELS` i `src/types.ts` med nye `costInput`/`costOutput`-værdier (USD pr. million tokens).

### Skift valutakurs

Opdatér `USD_TO_DKK` konstanten i `src/components/ApiUsageDisplay.tsx`.

---

## Licens

Proprietær. Alle rettigheder forbeholdes.
