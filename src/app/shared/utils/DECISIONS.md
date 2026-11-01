# Decisions — Shared utilities

## 2026-10-29 — Two PDF extraction strategies coexist

`pdf-utils.ts` now holds two independent extraction paths.

The **line-stream path** (`extractTextFromPdf`) emits one line per text run and no coordinates. The member import only needs `Last, First` lines followed by a gender line, and works; this path is retained unchanged for `members-import-page`.

The **positioned path** (`extractPositionedRuns`) exists for importers that need geometry, such as the ministering report — a five-column table where district headers are drawn in a *later* content stream than the table body and a household's member rows can only be matched to a header geometrically. It walks the same tokeniser, font map, and content streams as the line-stream path, but tracks the text matrix: `Tm` supplies the run origin, `Td`/`TD`/`TL`/`T*` advance it, `Tf` supplies the font name and size, and each `Tj`, `TJ`, `'` or `"` emits one `TextRun`. A `TJ` array becomes a single run whose text is the concatenation of its strings; its kerning numbers do not appear in the text, they only shift the estimated advance.

### Consequences

- Future PDF importers that need geometry should use `extractPositionedRuns`; `extractTextFromPdf` is retained only for `members-import-page`.
- The positioned path still ignores `cm`, `q`, and `Q`, so a scaled or translated CTM is unhandled and coordinates are text-space rather than device-space.
- The positioned path does not traverse `Do` / Form XObjects: `extractPositionedRuns` reads only the page's `/Contents` streams. A report drawn inside a Form XObject therefore yields zero runs — a silent total failure, not a degraded one.
- Run origins advance by an *estimated* width (`size * 0.5` per character, plus `TJ` kerning), not a width resolved from the font. Two show operators on one line without an intervening `Tm` therefore drift; a `Tm` makes the origin exact again.
- The line-stream extractor's known fragility is untouched: `TJ` arrays are still discarded there, so such a PDF still yields empty text and an empty import.
- The positioned path now handles the `'` (T* then show) and `"` (set spacing, T* then show) operators; the line-stream path does not, so text drawn with them still disappears there.
- Two extractors in one file means two mental models; if the member import is ever revisited, collapsing them is the first thing to try.

## 2026-10-31 — A newly registered table needs a `version` to pull rows that already exist

Sync fetches `updated_at > lastSync` against one per-database watermark, so a table added later starts with an empty store and receives only rows changed after that watermark: on an existing install, nothing. Declaring `version: 1` on the table forces the full pull. Bumping it later forces another, but clears that table's local store first, so it also discards offline writes that have not been sent.
