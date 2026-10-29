# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase: one `GLOSSARY.md`, and `DECISIONS.md` files co-located with the code they constrain.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root, or
- **`GLOSSARY-MAP.md`** at the repo root if it exists: it points at one `GLOSSARY.md` per context. Read each one relevant to the topic.
- **`DECISIONS.md`**: read the one in the folder you're about to work in, and any in its parent folders up to the repo root. These record decisions that were expensive to reach, so read them before proposing a change that might contradict one.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## Decisions live next to the code they constrain

There is no central decision log. A decision goes in a `DECISIONS.md` beside the code it governs, so it is read by whoever (or whatever) is already working there:

- a decision about the ministering import → `src/app/private/callings/ministering/DECISIONS.md`
- a decision about the PDF extractor → `src/app/shared/utils/DECISIONS.md`
- a decision about schema history → `supabase/DECISIONS.md`

A decision that genuinely spans the repo goes in `DECISIONS.md` at the root. Prefer the narrowest folder that a reader of the decision would already be in.

This layout **overrides** the `domain-modeling` skill's own ADR instructions: that skill writes numbered files to `docs/adr/`, which do not belong in this repo. Follow its entry *format* (a title stating the decision, then the reasoning, with Considered Options and Consequences only where they add value), but write it as a dated `##` section in the nearest `DECISIONS.md`, not a new file in `docs/adr/`.

## File structure

Single-context repo (most repos):

```
/
├── GLOSSARY.md
├── DECISIONS.md                    ← only if a decision spans the repo
├── supabase/
│   └── DECISIONS.md
└── src/
    └── app/shared/utils/
        └── DECISIONS.md            ← beside the code it governs
```

Multi-context repo (presence of `GLOSSARY-MAP.md` at the root):

```
/
├── GLOSSARY-MAP.md
├── DECISIONS.md                    ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── DECISIONS.md            ← context-specific decisions
    └── billing/
        ├── GLOSSARY.md
        └── DECISIONS.md
```

One decision per `##` section, newest at the bottom, headed `<date> — <the decision, stated as a claim>`. Keep the reasoning that was expensive to reach: the options considered, and the consequence a future reader would otherwise try to "fix".

Do not append a decision to a `DECISIONS.md` far from the code it constrains just because one is closer to hand.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag decision conflicts

If your output contradicts a recorded decision, surface it explicitly rather than silently overriding:

> _Contradicts "Assignments reference a household, not a member" in `src/app/private/callings/ministering/DECISIONS.md`, but worth reopening because…_

Name the decision by its heading and give the path, so the reader can find it without a search.
