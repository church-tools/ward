# Decisions — Shared utilities

## 2026-10-29 — Two PDF extraction strategies coexist

`pdf-utils.ts` keeps an extractor that emits one line per text run with no coordinates. The member import only needs `Last, First` lines followed by a gender line, and works. The ministering report is a five-column table where the district headers are drawn in a *later* content stream than the table body, and where a household's member rows can only be matched to it geometrically — position is the only reliable signal. Rather than change the extractor under the working member importer, we added a second path that keeps each run's `Tm` x/y (the operators are already tokenised) and clusters columns, then cells, then associates.

### Consequences

- Future PDF importers should use the positioned path; the line-stream one is retained only for `members-import-page`.
- The known fragility of the line-stream extractor is untouched: `TJ` arrays are discarded, so a PDF built that way still yields empty text and an empty import.
- Two extractors in one file means two mental models; if the member import is ever revisited, collapsing them is the first thing to try.
