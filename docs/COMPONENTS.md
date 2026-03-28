# Komponentdokumentation

Alle komponenter findes i `src/components/`. Denne fil dokumenterer hver komponent, dens props, og dens formål.

---

## Navigering og layout

### `Sidebar.tsx`

Venstre sidebar med bogstruktur og navigation.

**Funktioner:**
- Viser bogtitel (redigerbar)
- Sektions- og kapitelsliste med sideestimater
- AI-værktøjsknap (aktiverer valgmode)
- Handlingsknapper: "Rediger (N)" og "Analysér (N)" valgte kapitler
- Nøgleord/scoring-knapper
- "Tjek batches (N)"-knap med ventende batch-tæller
- Link til "AI-analyser"
- Cloud sync-status (online/offline/gemmer)
- Seneste gemt-tidspunkt
- `ApiUsageDisplay` i footer

**State brugt:**
- `book`, `activeView`, `sidebarOpen`, `aiSelectionMode`
- `aiSelectedChapters`, `pendingBatches`, `batchChecking`
- `keywordsProcessing`, `scoreProcessing`

---

### `BookOverview.tsx`

Oversigtssiden for hele bogen.

**Funktioner:**
- Bogtitel-editor
- Statistikkort: sektioner, kapitler, ord, sider, LIX
- Mål-editorer (sider + LIX)
- RTF-eksportknap
- Filtrering efter kapitelstatus og nøgleord
- Sektionskort med:
  - AI-valgcheckbokse (i valgmode)
  - Flyt op/ned, redigér, slet
  - Statistik: antal kapitler, ord, sider, LIX, progress
  - Kapitelsliste med status, nøgleord, score
- Tilføj ny sektion

---

### `SectionView.tsx`

Visning af en enkelt sektion.

**Props:**
```typescript
{ section: Section }
```

**Funktioner:**
- Tilbage-knap til overblik
- Sektionsheader med redigering
- Sektionsstatistik + mål
- Kapitelsliste med AI-checkbokse, status, flytning
- Tilføj nyt kapitel

---

## Editor

### `ChapterEditor.tsx`

Hovededitoren for et kapitel.

**Props:**
```typescript
{ section: Section; chapter: Chapter }
```

**Funktioner:**
- Tiptap WYSIWYG-editor med fuld toolbar
- Kapiteloverskrift inline med QuickAIField til højre
- Statistikrække: status, ord, tegn, sider, LIX
- Værktøjsrække: LIX-mål, versionshistorik, eksport, billedgenerering
- Nøgleord-visning (badges)
- Score-visning (0–100, farvekodning)
- **Tekstmarkerings-AI:**
  - Vises som gul bjælke under toolbar når tekst er markeret
  - Klik "AI: omskriv markeret tekst" → prompt-input vises
  - Vælg model, skriv instruktion, klik "Kør"
  - Kalder `/api/ai-selection` synkront
  - Erstatter den markerede tekst med AI-resultatet
- Fejlvisning med debug-info

**Editor-konfiguration:**
- StarterKit (paragraphs, headings, lists, blockquotes)
- Underline, Highlight
- TextAlign (venstre, center, højre)
- Placeholder
- Debounced content-save (300ms)

---

### `QuickAIField.tsx`

Kompakt inline AI-redigeringsfelt.

**Props:**
```typescript
{ sectionId: string; chapterId: string }
```

**Funktioner:**
- Indlejret i kapitelheader til højre for titlen
- Prompt-input med preset-dropdown
- Model-vælger (kompakt)
- Kør-knap → `processChapterWithAi()` (batch)
- Preset-dropdown med 5 redigeringspresets

---

## AI-funktioner

### `AIPanel.tsx`

Højre sidepanel til batch AI-operationer.

**Funktioner:**
- Tabs: Redigering / Analyse
- Preset-vælger (PRESET_PROMPTS eller ANALYSIS_PROMPTS)
- Fritekst-prompt-felt
- Model-vælger
- Score-spørgsmål (for scoring-mode)
- Visning af valgte kapitler
- "Send til redigering/analyse"-knap
- Ventende batches med:
  - Alder (timer/minutter siden submission)
  - Type og kapiteltitler
  - Fjern-knap (skraldespand)
- "Tjek batches"-knap
- AI-log med farvekodede beskeder
- Fejlvisning

---

### `AnalysesView.tsx`

Visning af gemte AI-analyser.

**Funktioner:**
- Liste over alle analyser (nyeste først)
- Hver analyse viser: tidspunkt, model, prompt, resultat, kapiteltitler
- Data hentes fra `/api/load-analyses`

---

### `VersionHistory.tsx`

Modal med versionshistorik for et kapitel.

**Props:**
```typescript
{ sectionId: string; chapter: Chapter }
```

**Funktioner:**
- Liste over alle versioner (nyeste først)
- Kilde: "AI" eller "Manuel" med labels
- AI-versioner viser model + prompt
- Gendan-knap → arkiverer nuværende, gendanner valgte
- Vis indhold-knap
- Vis diff-knap → ord-niveau sammenligning

---

### `ImageGenerator.tsx`

Modal til AI-billedgenerering.

**Props:**
```typescript
{ sectionId: string; chapter: Chapter }
```

**Funktioner:**
- Generer illustration-knap
- Valgfri brugerdefineret prompt
- Automatisk prompt baseret på kapitelindhold
- Galleri med alle genererede billeder
- Slet billede-knap
- Genererer via Google Gemini (diagramstil)

---

## Statistik og mål

### `LixDisplay.tsx`

Inline visning af LIX-score.

**Props:**
```typescript
{ lix: LixResult | null; goal?: number | null; size?: 'sm' | 'md' }
```

**Visning:**
- Score + label (f.eks. "38 — Middel")
- Farvekodning: grøn (nær mål), gul (lidt over/under), rød (langt fra mål)
- Ordtælling-breakdown

---

### `LixGoalEditor.tsx`

Modal til at sætte LIX-mål.

**Props:**
```typescript
{ currentGoal: number | null; onSave: (lix: number | null) => void; label: string }
```

---

### `GoalEditor.tsx`

Modal til at sætte sidemål.

**Props:**
```typescript
{ currentGoal: number | null; onSave: (pages: number | null) => void; label: string; icon: ReactNode }
```

---

### `ProgressBar.tsx`

Fremskridtslinje.

**Props:**
```typescript
{ current: number; goal: number; size?: 'sm' | 'md' }
```

Farvekodning: grøn (<90%), gul (90-100%), rød (>100%).

---

### `PageStats.tsx`

Kompakt sidestatistik.

**Props:**
```typescript
{ pages: number; goal: number | null }
```

---

## Øvrige komponenter

### `ChapterStatusDropdown.tsx`

Dropdown til kapitelstatus.

**Props:**
```typescript
{ status: ChapterStatusId; onChange: (status: ChapterStatusId) => void; size?: 'sm' | 'md' }
```

**Statuser:**
| ID | Label | Farve |
|----|-------|-------|
| `ikke-paabegyndt` | Ikke påbegyndt | Stone |
| `udarbejdes` | Udarbejdes | Blue |
| `sendt-korrektur` | Sendt til korrektur | Amber |
| `korrektur-indarbejdet` | Korrektur indarbejdet | Purple |
| `klar-til-tryk` | Klar til tryk | Emerald |

---

### `ExportButton.tsx`

RTF-eksportknap.

**Props:**
```typescript
{ type: 'chapter' | 'section' | 'book'; chapter?: Chapter; section?: Section }
```

Bruger `htmlToRtf()` og `downloadRtf()` fra `src/utils/rtf-export.ts`.

---

### `ApiUsageDisplay.tsx`

API-forbrugsoversigt i DKK.

**Funktioner:**
- Knap viser totalt forbrug i kr.
- Modal med:
  - **Anthropic**: Forbrug i DKK, antal kald, tokens
  - **Google**: Forbrug i DKK, antal billeder
  - Total samlet forbrug
  - Detaljeret kaldhistorik (seneste 20)
- Kursfaktor: `USD_TO_DKK = 7.0`
- Google-estimat: ~0,30 kr. pr. billede
