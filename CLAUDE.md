# CLAUDE.md — Bogskriveren

Kontekstfil til AI-assisteret udvikling med Claude Code.

## Projektoverblik

Bogskriveren er et dansk bogskrivningsværktøj med AI-funktioner. React 18 frontend + Netlify serverless backend.

## Kommandoer

```bash
npm run dev          # Start Vite dev-server (kun frontend)
npm run build        # TypeScript-check + Vite production build
netlify dev          # Fuld lokal udvikling inkl. serverless functions
```

## Arkitektur

- **Frontend**: React 18, TypeScript 5.7, Zustand 5, Tiptap 2.11, Tailwind CSS 3.4, Vite 6
- **Backend**: Netlify Functions (serverless), Netlify Blobs (storage)
- **AI**: Anthropic Claude (Haiku/Sonnet/Opus) via Batches API, Google Gemini (billeder)
- **State**: Zustand store i `src/store.ts` — al tilstand samlet ét sted
- **Typer**: Alle typer i `src/types.ts`

## Vigtige konventioner

### Sprog
- Al UI-tekst, prompts, labels og beskeder er på **dansk**.
- Brug `da-DK` locale til datoer og talformatering.

### AI Batch-mønster
Al AI-behandling der kan tage >26 sekunder bruger Anthropic Batches API (fire-and-forget):
1. `POST /api/ai-batch-submit` — opretter batch, returnerer `batchId` med det samme
2. `batchId` gemmes i `pendingBatches` (localStorage + Zustand)
3. Bruger poller manuelt med "Tjek batches"-knap → `POST /api/ai-batch-status`
4. Resultater anvendes når `status === 'ended'`

Undtagelse: `POST /api/ai-selection` er synkron (korte tekstmarkeringer, typisk <10s).

### Batch custom_id format
Skal matche `^[a-zA-Z0-9_-]{1,64}$`. Brug `--` som separator, ALDRIG `:`.
Format: `{type}--{sectionId}--{chapterId}`, trunkeret til 64 tegn.

### HTML-håndtering
- Tiptap gemmer indhold som HTML i `chapter.content`
- Netlify functions konverterer HTML → plaintext med `htmlToText()` før AI-kald
- AI returnerer HTML-formateret tekst der indsættes direkte i editoren

### State-mønster
- Alle mutationer går gennem `updateBook()` i store.ts
- `updateBook()` gemmer til localStorage og trigger debounced server-save (1s)
- Serverfunktioner bruger Netlify Blobs med store-navn `book-data`

### Modeller og priser
Defineret i `AI_MODELS` i `src/types.ts`. Priser vises i DKK (kurs i `ApiUsageDisplay.tsx`).

## Nøglefiler

| Fil | Beskrivelse |
|-----|-------------|
| `src/store.ts` | Al applikationstilstand (Zustand) |
| `src/types.ts` | Alle TypeScript-typer, AI_MODELS, presets |
| `src/App.tsx` | Routing baseret på `activeView` |
| `src/components/ChapterEditor.tsx` | Tiptap-editor + AI selection bar |
| `src/components/AIPanel.tsx` | AI batch-panel (højre sidebar) |
| `src/components/Sidebar.tsx` | Navigation + bogstruktur |
| `netlify/functions/ai-batch-submit.ts` | Opret Anthropic batch |
| `netlify/functions/ai-batch-status.ts` | Poll batch + hent resultater |
| `netlify/functions/ai-selection.ts` | Synkron tekstomskrivning |
| `netlify/functions/generate-image.ts` | Gemini billedgenerering |

## Typisk workflow for nye features

1. Tilføj/opdatér typer i `src/types.ts`
2. Tilføj state + actions i `src/store.ts`
3. Opret/opdatér komponent i `src/components/`
4. Opret serverless function i `netlify/functions/` (hvis nødvendigt)
5. Tilføj function til `netlify.toml` (med `external_node_modules` for Anthropic SDK)
6. Kør `npm run build` for at verificere TypeScript

## Miljøvariabler

```
ANTHROPIC_API_KEY    # Påkrævet
GOOGLE_API_KEY       # Valgfri (billeder)
```

## Netlify Blobs nøgler (book-data store)

| Nøgle | Indhold |
|-------|---------|
| `book` | Book-objekt (hele bogen) |
| `analyses` | AIAnalysis[] (gemte analyser) |
| `api-usage` | ApiUsage (Anthropic token-forbrug) |
| `google-usage` | Google API-forbrug (billedtæller) |

## Kendte begrænsninger

- Netlify Functions har ~26-30s hard timeout — derfor batch-mønsteret for AI
- Ingen autentificering — enhver med URL kan tilgå
- LocalStorage har ~5MB grænse — store bøger med mange billeder kan ramme den
- Batch-behandling tager typisk 2-5 minutter (Anthropic backend)
