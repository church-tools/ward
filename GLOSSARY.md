# Ward Tools

Ward Tools supports ward operations including membership tracking, calling assignments, meeting agenda planning, and sacrament meeting preparation.

## Language

### Unit

**Unit**:
A church congregation (ward or branch) that owns its members, callings, meetings, and settings.
_Avoid_: ward, branch, congregation, group

**Unit admin**:
A user with administrative privileges scoped to their own unit.
_Avoid_: ward admin, local admin

**Profile**:
A user account linking an auth identity to a unit, with admin roles and approval status. May optionally reference a member.
_Avoid_: user account, user record

**Join link**:
A shared unit link that lets someone request access; only one active link exists per unit at a time.
_Avoid_: invite link, invitation link, join URL

**Approval required**:
A unit setting that requires approval before access is granted through a join link.
_Avoid_: confirmation required, approval needed, pending approval

**Pending**:
A profile state where the user has joined the unit but awaits approval.
_Avoid_: awaiting approval, unapproved

**Approved**:
A profile state where the user has full unit access.
_Avoid_: confirmed, active

**Rejected**:
A profile state where the user's join request was denied.
_Avoid_: denied, blocked

### Auth emails

**Auth email**:
A user-facing email that helps a person complete account setup or regain access.
_Avoid_: system email, notification email

**Confirmation email**:
An auth email that confirms an email address before access is enabled.
_Avoid_: verify email, activation email

**Invitation email**:
An auth email that invites someone to join Ward Tools through a shared link.
_Avoid_: invite email, onboarding email

**Password reset email**:
An auth email that lets a person set a new password after requesting a reset.
_Avoid_: reset link email

### Members & Callings

**Member**:
A person belonging to a unit, with a name and gender.
_Avoid_: person, individual, ward member

**Organization**:
A group within a unit, such as bishopric or relief society, each with a gender affiliation.
_Avoid_: group, quorum, auxiliary

**Calling**:
A named role within an organization, such as "Bishop" or "Sunday School Teacher".
_Avoid_: position, assignment, role

**Member calling**:
The assignment of a member to a calling, progressing through lifecycle states from proposed to set apart, and through release states to end the assignment.
_Avoid_: calling assignment, member assignment

**Language**:
A language spoken by members in a unit.
_Avoid_: locale, tongue

### Bulletin board

**Bulletin board**:
A public-facing display of posters for a unit, accessible by a shared key without login.
_Avoid_: notice board, public board

**Poster**:
One or more files attached to an organization for display on the bulletin board.
_Avoid_: flyer, notice, announcement poster

### Agendas

**Agenda**:
A recurring leadership meeting template with a name, weekday, and start time.
_Avoid_: meeting template, recurring meeting

**Agenda item**:
An item within an agenda, typed as suggestion, topic, or task, and tracked through workflow states.
_Avoid_: task, action item, agenda entry

**Agenda section**:
A structural block within an agenda, such as a text block, prayer slot, or calling review section.
_Avoid_: agenda block, meeting section

### Sacrament meeting

**Sacrament meeting**:
A specific weekly worship service, keyed by calendar week.
_Avoid_: sacrament service, Sunday meeting, worship service

**Fixed hymn**:
One of three required hymns on a sacrament meeting: opening, sacrament, or closing. Stored directly on the meeting rather than as an agenda item.
_Avoid_: preset hymn, meeting hymn, standard hymn

**Message**:
A talk or sermon within a sacrament meeting, with a speaker, topic, and duration.
_Avoid_: talk, speech, sermon

**Hymn**:
A congregational song within a sacrament meeting, identified by hymn number.
_Avoid_: song, congregational hymn, singing

**Musical performance**:
A special musical number within a sacrament meeting, with a name and performers.
_Avoid_: special number, musical number, performance

**Custom text**:
Free-form text content within a sacrament meeting, such as announcements.
_Avoid_: free text, note, announcement

### Meetings (future)

**Canvas**:
A shared infinite drawing surface that will be attachable to agendas. (Future concept, powered by tldraw.)
_Avoid_: board, whiteboard

## Architecture

Ward Tools is an **Angular 22** application running **zoneless** with full **signal-based** reactivity. There is no `NgZone`, no `zone.js` outside of tests, and no RxJS `Observable` for component state. All component state flows through Angular signals (`signal`, `input`, `computed`, `viewChild`, `contentChild`) and the project's custom signal utilities.

### Signal utilities (`src/app/shared/utils/signal-utils.ts`)

- **`xsignal<T>(initialValue?)`** — Awaitable writable signal with implicit null handling. Use instead of raw `signal()` for component state.
- **`xcomputed<T>(deps, fn)`** — Type-safe computed that unwraps dependencies intelligently, so no null-checks needed inside the computation.
- **`asyncComputed<T>(deps, fn, default?)`** — For async-derived state. Returns `undefined` (or the default) while the promise is pending.
- **`xeffect(deps, fn)`** — Signal-aware side effect; use only for logging, analytics, or external sync — never for component logic.
- **`waitForNextChange(signal, injector)`** — Waits for the next non-initial value of a signal.

### Component patterns

- **All inputs use `input()` / `input.required()`** — no `@Input()` decorators.
- **All view queries use `viewChild()` / `contentChild()`** — no `@ViewChild()` / `@ContentChild()` decorators.
- **Templates use `@if` / `@for`** — no `*ngIf` / `*ngFor` structural directives.
- **Signals are unwrapped as functions**: `{{ state() }}`, `[property]="value()"`.
- **Services expose signals** for state, never `Observable`.
- **`effect()` is only used in services** (data sync, persistence), never in components.
- **Discriminated unions** for async states (`{ state: 'loading' } | { state: 'loaded'; data: T }`).

### Local-first data (SupaSync)

- **IndexedDB is the source of truth** — all queries go through SupaSync (`src/app/shared/utils/supa-sync/`), never direct `supabase.from()` calls.
- Data syncs to Supabase in the background via Supabase Realtime channels.
- Offline-first: all CRUD operations work against IndexedDB and sync when online.

### Testing

- **Vitest** with **jsdom** environment, configured via `vitest.config.ts`.
- `src/setup-vitest.ts` initializes `fake-indexeddb`, zone.js testing utilities, and Angular's `TestBed`.
- Component tests use `TestBed.configureTestingModule` / `TestBed.createComponent` with manual mocks for `SupabaseService`.

### Key constraints

- **No `any` types** — use proper generics or `unknown` with type guards.
- **Strict null checks** everywhere — `null` means "data not yet available".
- **One source of truth** per data entity — derived state uses `computed()`, never stored separately.
- **Explicit return types** at module boundaries (API functions, service methods, signal factories).

## Relationships

- A **Unit** has one **Approval required** setting and at most one active **Join link**.
- A **Unit** contains **Members**, **Organizations**, **Agendas**, and **Sacrament meetings**.
- A **Profile** links an auth identity to a **Unit** and may reference a **Member**.
- A **Profile** is **Pending** until **Approved** or **Rejected** by a **Unit admin**.
- An **Organization** belongs to a **Unit** and contains **Callings**.
- A **Member calling** links a **Member** to a **Calling**.
- A **Member** may speak one or more **Languages**.
- A **Poster** belongs to an **Organization** and appears on the **Bulletin board**.
- A **Bulletin board** is scoped to a **Unit**.
- An **Agenda** contains **Agenda items** and **Agenda sections**.
- A **Sacrament meeting** has three **Fixed hymns** (opening, sacrament, closing).
- A **Sacrament meeting** contains **Messages**, **Hymns**, **Musical performances**, and **Custom text**.
- An **Auth email** has one purpose: confirmation, invitation, or password reset.

## Example dialogue

> **Dev:** "Is this a Confirmation email or an Invitation email?"
> **Domain expert:** "Use Confirmation email when the person is finishing setup for an existing account, and Invitation email when they are joining from a shared join link."

> **Dev:** "Does the hymn go on the sacrament meeting or as an agenda item?"
> **Domain expert:** "Fixed hymns (opening, sacrament, closing) are stored directly on the sacrament meeting. Additional congregational hymns go in the agenda item list as Hymns."

> **Dev:** "Is the Agenda canvas shared or per person?"
> **Domain expert:** "Shared — one canvas per Agenda for the whole unit."
