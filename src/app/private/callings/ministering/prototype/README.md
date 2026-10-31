# Ministering organizing — UI prototype (throwaway)

**Question this answers:** how do we visualize organizing ministering so that the
brothers without a companionship and the households nobody ministers to are *always*
easy to spot — without falling back to "three tables in three places"?

Open `ministering-prototype.html` by double-clicking it. No build, no server, no
login, no database. Everything is fake data in memory; closing the tab throws away
every change. `Reset data` in the switcher puts the ward back.

Switch with the floating bar at the bottom, the arrow keys, or the URL:
`ministering-prototype.html?variant=W` (or `#W`).

| Key | Variant | What it bets on |
| --- | --- | --- |
| A | Twin trays & district spine | **Pinned pools.** Unassigned brothers and households sit in fixed left/right trays around a district-ordered card spine. Select a name, click a companionship. |
| D | Constellation map | **Space.** Districts are bands, companionships are hubs, households are satellites. Gaps are empty hubs and unattached nodes; the pools are docked below. |
| D2 | Map & trays | D's map with A's two side trays — does the map get better when the gaps don't share the bottom? |
| W | Wheel & halo | **Circle.** A sunburst: districts are arcs, companionships are blades, households orbit as dots, and the gaps ride two outer halos. Select from a halo, click a blade. |
| S | String board | **Tactile.** A corkboard of taped, pinned paper cards; districts are lanes. Deliberately whimsical and bad at scale — included because it makes the structural assumptions obvious. |
| P | Slots | **Capacity.** Each companionship is a rack with four visible slots; empty slots are the room you have. Gaps wait in two queues above the floor. |

All variants share one in-memory ward and the same mutations, so a change made in
one is still there when you flip to another. That is deliberate — compare layouts
against the same state, not a fresh one.

## What is (deliberately) fake

- 3 districts, 16 companionships, 39 brothers, 48 households; 6 free brothers,
  11 uncovered households, 1 companionship with no household.
- Every name is invented. No persistence, no auth, no SupaSync, no real LCR import.
- Desktop-first: the layouts assume a window wide enough for side trays; the wheel
  and map scroll horizontally on smaller screens.
- Copy is hardcoded English. Real code goes through `LocalizePipe`.

## Domain notes found while building this

1. `src/app/private/callings/ministering/DECISIONS.md` says assignments reference a
   **household**, but the regenerated `database.d.ts` still has
   `member_ministered_in.member` and no `household` column. The prototype follows
   the decision (households), not the types.
2. `GLOSSARY.md` says a district contains companionships, but `ministering_area`
   has no district FK in `database.d.ts`. Every district-based variant here assumes
   that link exists; if it stays missing, the district spine is not implementable
   without a schema change.
3. The import decision says a new LCR report **deletes and rewrites every area**.
   Any companionship created or reshaped on this screen would be wiped by the next
   import. The prototype shows the interaction anyway; whether in-app edits should
   survive an import is a product decision, not a layout one.
4. "Family" in the original request is a **Household** in the glossary. The
   prototype uses the glossary term.

## After a variant wins

Per the prototype skill: fold the winning structure into the real page, write down
the verdict (which variant, why, what to steal from the others) on the
implementation issue, and keep this file on a throwaway branch — not in `main`.
