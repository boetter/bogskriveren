# API-dokumentation

Alle serverless functions kører som Netlify Functions og er tilgængelige under `/api/`-stien.

---

## Datapersistering

### `POST /api/book-save`

Gemmer hele bogen til Netlify Blobs.

**Request body:**
```json
{
  "title": "Min Bog",
  "sections": [
    {
      "id": "uuid",
      "title": "Sektion 1",
      "chapters": [
        {
          "id": "uuid",
          "title": "Kapitel 1",
          "content": "<p>HTML-indhold</p>",
          "status": "udarbejdes",
          "keywords": ["ledelse", "strategi"],
          "score": 75,
          "scoreQuestion": "Er indholdet praktisk anvendeligt?",
          "versions": [],
          "images": []
        }
      ]
    }
  ],
  "goalPages": 200,
  "goalLix": 40
}
```

**Response:** `{ "success": true }`

---

### `GET /api/book-load`

Henter bogen fra Netlify Blobs.

**Response:** Book-objekt (samme format som `book-save` request body) eller tom skabelon.

---

### `GET /api/load-analyses`

Henter gemte AI-analyser.

**Response:**
```json
[
  {
    "id": "uuid",
    "timestamp": "2026-03-28T10:00:00Z",
    "prompt": "Find overlap mellem kapitler",
    "result": "Kapitel 3 og 7 omhandler begge...",
    "model": "claude-sonnet-4-6",
    "chapterTitles": ["Kapitel 3", "Kapitel 7"]
  }
]
```

---

## AI Batch-behandling

### `POST /api/ai-batch-submit`

Opretter en Anthropic Message Batch. Returnerer med det samme (fire-and-forget).

**Request body:**
```json
{
  "type": "process | analyze | keywords | scores",
  "chapters": [
    {
      "id": "uuid",
      "sectionId": "uuid",
      "title": "Kapitel 1",
      "content": "<p>HTML-indhold</p>"
    }
  ],
  "prompt": "Forkort teksten til halvdelen",
  "model": "claude-sonnet-4-6",
  "question": "Er indholdet praktisk anvendeligt?"
}
```

| Felt | Påkrævet | Beskrivelse |
|------|----------|-------------|
| `type` | Ja | Batchtype: `process`, `analyze`, `keywords` eller `scores` |
| `chapters` | Ja | Kapitler der skal behandles |
| `model` | Ja | AI-model ID |
| `prompt` | For `process`/`analyze` | Instruktion til AI |
| `question` | For `scores` | Spørgsmål til scoring |

**Batchtyper:**

| Type | Beskrivelse | Requests pr. batch |
|------|-------------|-------------------|
| `process` | Redigér kapiteltekst | 1 pr. kapitel |
| `analyze` | Analysér alle kapitler samlet | 1 total |
| `keywords` | Udtræk nøgleord | 1 pr. kapitel |
| `scores` | Scorér kapitler (0–100) | 1 pr. kapitel |

**Response:**
```json
{
  "batchId": "msgbatch_abc123",
  "requestCount": 5,
  "status": "in_progress"
}
```

---

### `POST /api/ai-batch-status`

Tjekker status på en batch og henter resultater når den er færdig.

**Request body:**
```json
{
  "batchId": "msgbatch_abc123",
  "type": "process",
  "prompt": "Forkort teksten",
  "model": "claude-sonnet-4-6",
  "chapterTitles": ["Kapitel 1", "Kapitel 2"]
}
```

**Response (stadig i gang):**
```json
{
  "status": "in_progress",
  "counts": {
    "processing": 3,
    "succeeded": 2,
    "errored": 0,
    "canceled": 0,
    "expired": 0
  }
}
```

**Response (færdig):**
```json
{
  "status": "ended",
  "counts": { "succeeded": 5 },
  "results": [
    {
      "customId": "process--sectionId--chapterId",
      "status": "succeeded",
      "content": "<p>Redigeret tekst...</p>",
      "usage": {
        "inputTokens": 1500,
        "outputTokens": 800
      }
    }
  ]
}
```

Resultater for `analyze`-batches gemmes automatisk som AIAnalysis i Netlify Blobs.

---

## Synkron AI-behandling

### `POST /api/ai-selection`

Omskriver markeret tekst med AI. Synkron (blokerende) — beregnet til korte tekstmarkeringer.

**Request body:**
```json
{
  "selectedText": "Den markerede tekst i plaintext",
  "fullContent": "<p>Fuld kapitelindhold som HTML (kontekst)</p>",
  "prompt": "Gør sproget mere formelt",
  "model": "claude-sonnet-4-6"
}
```

**Response:**
```json
{
  "content": "<p>Den omskrevne tekst i HTML</p>",
  "usage": {
    "inputTokens": 500,
    "outputTokens": 200
  }
}
```

> **Bemærk:** Denne funktion er synkron og har en ~26s timeout på Netlify. Den er beregnet til korte markeringer (enkelte afsnit). For større tekstmængder bør batch-metoden bruges.

---

## Legacy AI-endpoints (synkrone)

Disse endpoints bruges ikke længere aktivt — batch-versionerne er at foretrække.

### `POST /api/ai-process`
Redigér ét kapitel synkront. Timeout-risiko for store kapitler.

### `POST /api/ai-analyze`
Analysér kapitler synkront. Timeout-risiko for mange kapitler.

### `POST /api/ai-keywords`
Udtræk nøgleord synkront (sekventiel loop). Timeout-risiko for >5 kapitler.

### `POST /api/ai-score`
Scorér kapitler synkront (sekventiel loop). Timeout-risiko for >5 kapitler.

---

## Billedgenerering

### `POST /api/generate-image`

Genererer illustration via Google Gemini 3 Pro.

**Request body:**
```json
{
  "chapterContent": "<p>Kapitelindhold</p>",
  "chapterTitle": "Kapitel 1",
  "customPrompt": "Lav et flowchart over processen"
}
```

| Felt | Påkrævet | Beskrivelse |
|------|----------|-------------|
| `chapterContent` | Ja | Kapitelindhold (HTML) |
| `chapterTitle` | Ja | Kapiteltitel |
| `customPrompt` | Nej | Overstyr standardprompt |

**Response:**
```json
{
  "imageData": "data:image/png;base64,iVBOR...",
  "prompt": "Lav et flowchart over processen"
}
```

Tracker automatisk forbrug i Netlify Blobs under `google-usage`.

---

## Forbrugssporing

### `GET /api/api-usage`

Henter Anthropic API-forbrug.

**Response:**
```json
{
  "totalInputTokens": 150000,
  "totalOutputTokens": 50000,
  "calls": [
    {
      "id": "uuid",
      "timestamp": "2026-03-28T10:00:00Z",
      "model": "claude-sonnet-4-6",
      "inputTokens": 1500,
      "outputTokens": 800,
      "chapterTitle": "Kapitel 1",
      "prompt": "Forkort teksten"
    }
  ]
}
```

---

### `GET /api/google-usage`

Henter Google API-forbrug (billedgenerering).

**Response:**
```json
{
  "imageCount": 12,
  "calls": [
    {
      "id": "uuid",
      "timestamp": "2026-03-28T10:00:00Z",
      "chapterTitle": "Kapitel 1"
    }
  ]
}
```

---

## Fejlhåndtering

Alle endpoints returnerer fejl i dette format:

```json
{
  "error": "Beskrivelse af fejlen"
}
```

HTTP-statuskoder:
- `400` — Ugyldig request (manglende felter)
- `405` — Forkert HTTP-metode
- `500` — Serverfejl (manglende API-nøgle, API-fejl)
