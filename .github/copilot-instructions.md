---
name: "ward-tools Project Instructions"
description: "Use when: building Angular components, creating API endpoints, working with state management, or debugging type issues in the ward-tools project"
applyTo:
  - "src/**"
  - "functions/**"
---

# Ward-Tools Project Instructions

This project is a Church management application built with Angular, Supabase, and Cloudflare Workers. These instructions establish our architecture patterns, state management approach, and type safety practices to minimize debugging friction.

## Key Principles

### 1. Angular Signals & Reactive State Management

**Use the custom signal utilities in `src/app/shared/utils/signal-utils.ts` consistently.**

- **`xsignal<T>(initialValue?)` for writable state**: Creates an awaitable writable signal with implicit null handling. Always use this instead of plain `signal()` for component state.
  ```typescript
  // ✅ GOOD
  const userId = xsignal<string | null>(null);
  userId.set("123"); // automatically resolves asPromise
  
  // ❌ AVOID
  const userId = signal<string | null>(null);
  ```

- **`xcomputed<T>()` for derived state**: Type-safe computed signals that unwrap dependencies intelligently. Pass an array of signal dependencies and a computation function.
  ```typescript
  // ✅ GOOD - no null checks needed, types are strict
  const userName = xcomputed([userId, userData], (id, data) => data.name);
  
  // ❌ AVOID - don't use default `computed()` which allows null values to leak
  ```

- **`asyncComputed<T>()` for async-derived state**: Use for any computation that returns a Promise. Supports optional default value for UI loading states.
  ```typescript
  // ✅ GOOD
  const memberDetails = asyncComputed(
    [memberId], 
    (id) => api.fetchMember(id),
    undefined // default while loading
  );
  ```

**Always unwrap signals in templates with `signal()` syntax**, not `.asSignal()`:
```html
<!-- ✅ GOOD -->
<div>{{ userId() }}</div>

<!-- ❌ AVOID -->
<div>{{ userId.asSignal() | async }}</div>
```

### 2. Local-First Architecture with SupaSync

**All persistent data flows through SupaSync (`src/app/shared/utils/supa-sync/`), never direct API calls.**

- **IndexedDB is the source of truth**: Data lives locally first, syncs to Supabase when online
- **Define tables in SupaSync config**: Each table has local indexing, calculated fields, and reverse dependencies
- **Offline-first thinking**: Assume users might be offline; all queries work against IndexedDB
- **Real-time sync via Supabase Realtime**: Changes from other users appear automatically via SupaSync channels

```typescript
// ✅ GOOD - query local IDB first
const members = await supaSync.members.query();

// ❌ AVOID - don't bypass SupaSync
const members = await supabaseClient
  .from('members')
  .select('*');
```

**When modifying data:**
```typescript
// ✅ GOOD - SupaSync handles local + cloud sync
await supaSync.members.insert({ name: "John" });
await supaSync.members.update(id, { approved: true });

// ❌ AVOID - direct API calls bypass local sync
await api.updateMember(id, data);
```

### 3. Type Safety to Reduce Debugging

**Leverage strict TypeScript configuration. These practices prevent runtime errors:**

- **Use `never` for impossible states**: Don't use union types for data that should have one valid value
  ```typescript
  // ✅ GOOD
  type MemberState = { type: 'loading' } | { type: 'loaded'; data: Member };
  
  // ❌ AVOID
  type MemberState = { isLoading: boolean; data: Member | null };
  ```

- **Strict null checks everywhere**: Assume `null` means "data not yet available", never use optional chaining carelessly
  ```typescript
  // ✅ GOOD - explicit null handling
  const role = user ? user.role : 'guest';
  
  // ❌ AVOID - hides potential bugs
  const role = user?.role ?? 'guest';
  ```

- **Define types at module boundaries**: API functions, service methods, and signal types should all have explicit return types
  ```typescript
  // ✅ GOOD
  export function getMemberData(id: string): Promise<Member | null> {
    // ...
  }
  
  // ❌ AVOID
  export function getMemberData(id: string) {
    // ...inferred type
  }
  ```

- **Use discriminated unions for async states**: Always distinguish loading, success, and error
  ```typescript
  // ✅ GOOD
  type AsyncState<T> = 
    | { state: 'loading' }
    | { state: 'success'; data: T }
    | { state: 'error'; error: Error };
  
  // ❌ AVOID
  type AsyncState<T> = { loading: boolean; data?: T; error?: Error };
  ```

## Component Development

### Template & Signals

- Always bind signals as functions: `{{ state() }}`, `[property]="value()"`
- Use `@if` and `@for` instead of `*ngIf` and `*ngFor`
- Mark component inputs with `input()` (not `@Input()`) for signal-based inputs

### Service Integration

- Services should expose signals for state, not Observables
- Use `effect()` only for side effects (logging, analytics), not for component logic
- Fetch data via `asyncComputed()` to keep UI automatically in sync

## API Endpoint Development (functions/)

### Function Structure

- Each endpoint in `functions/api/` should handle one specific operation
- Always validate input types at function entry point
- Use SupaSync for database queries, never use `supabaseClient.from()` directly in functions

### Type Safety in Functions

- Import shared types from database contracts
- Return explicit success/error responses with typed payloads:
  ```typescript
  type ApiResponse<T> = 
    | { success: true; data: T }
    | { success: false; error: string };
  ```

- Validate and transform input before processing
- Never return `null` as a sentinel value; use discriminated unions with specific error messages

## File Organization

```
src/
├── app/
│   ├── shared/utils/
│   │   ├── signal-utils.ts        # xsignal, xcomputed, asyncComputed
│   │   ├── supa-sync/             # SupaSync local-first orchestration
│   │   └── ...
│   ├── modules/                   # Feature modules by domain
│   │   ├── calling/
│   │   ├── member/
│   │   └── ...
│   ├── private/                   # Authenticated routes
│   └── public/                    # Public routes
├── environments/
└── app.config.ts                  # Root signal/service setup

functions/
├── api/                           # One endpoint = one file
└── shared/                        # Shared utilities
```

## Common Patterns

### Loading UI State
```typescript
const data = asyncComputed([id], (id) => api.fetch(id), undefined);

// In template:
@if (data() === undefined) {
  <p>Loading...</p>
} @else if (data() instanceof Error) {
  <p>Error: {{ data().message }}</p>
} @else {
  <p>{{ data().name }}</p>
}
```

### Dependent Signals
```typescript
const userId = xsignal<string | null>(null);
const user = asyncComputed([userId], (id) => api.getUser(id));
const userPermissions = asyncComputed([userId], (id) => api.getPermissions(id));
```

### Form Binding with Signals
```typescript
// Component
export class MyForm {
  name = xsignal('');
  email = xsignal('');
  
  async submit() {
    const result = await api.save({ name: this.name(), email: this.email() });
    // ...
  }
}
```

```html
<!-- Template -->
<input [(value)]="name()" (change)="name.set($any($event).target.value)" />
<button (click)="submit()">Save</button>
```

## When the Assistant Should Ask You Questions

- **Architecture choice unclear?** Ask which pattern (SupaSync vs direct API, signal vs observable)
- **Feature scope ambiguous?** Ask whether it affects component, service, or both layers
- **Type design options?** Ask which discriminated union structure best fits your mental model
- **Performance concern?** Ask whether to add memoization or signal effects

## Anti-Patterns to Avoid

- ❌ Mixing `Observable` and `Signal` for the same data stream
- ❌ Direct Supabase API calls in components (always via SupaSync)
- ❌ Storing derived state separately instead of using `computed()`
- ❌ Using `any` type to suppress TypeScript errors
- ❌ Creating signals inside component templates
- ❌ Async operations without error handling in signals
- ❌ Multiple sources of truth for the same data

## References

- Signal utilities: [signal-utils.ts](../../src/app/shared/utils/signal-utils.ts)
- SupaSync local-first sync: [supa-sync.ts](../../src/app/shared/utils/supa-sync/supa-sync.ts)
- Angular Signals docs: https://angular.io/guide/signals
- Supabase Realtime: https://supabase.com/docs/guides/realtime
