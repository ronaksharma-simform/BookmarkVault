# ADR 0001: Bookmark model and GET /api/bookmarks contract

- Status: Accepted
- Date: 2025-01-01 (slice: "Expose an empty bookmark list from the database")

## Context

BookmarkVault is built from an empty repository. This slice introduces the first
persistent domain concept (a bookmark) plus the first read path: a `GET
/api/bookmarks` endpoint that returns the bookmarks from the database, and a
`/bookmarks` page that renders them as a live list. Later slices will add
creation, tagging/editing, search and delete, so the schema and the API contract
decided here become the foundation everything else builds on.

## Decisions

### 1. Stack: Next.js (App Router) + Prisma ORM + PostgreSQL + Vitest
- `src/` directory layout, `@/*` path alias mapping to `./src/*`.
- Prisma is the data-access layer; `prisma/schema.prisma` is the single source of
  truth for the schema and migrations are committed under `prisma/migrations/`.
- Database provider is **PostgreSQL** (`postgresql`), configured via the
  `DATABASE_URL` environment variable (see `.env.example`).
- Tests run under Vitest (`node` environment). The route unit test mocks
  `@/lib/prisma` so it needs no live database.

### 2. Bookmark model
```prisma
model Bookmark {
  id        String   @id @default(cuid())
  title     String
  url       String
  tags      String[]
  createdAt DateTime @default(now())

  @@index([createdAt(sort: Desc)])
}
```
- `id`: cuid string (opaque, sort-safe, no sequential enumeration of user data).
- `tags`: a PostgreSQL text array. An empty list is the "no tags" value.
- `createdAt`: server default timestamp, indexed descending because the canonical
  list view is newest-first.

### 3. `GET /api/bookmarks` contract
- Returns a **JSON array** of bookmark objects (not an envelope object):
  `[{ "id": "...", "title": "...", "url": "...", "tags": [...], "createdAt": "..." }]`.
- Ordering is **newest first** (`orderBy: { createdAt: 'desc' }` at the database
  level); the response for an empty database is `[]`.
- The route is `force-dynamic` and responds with `Cache-Control: no-store` so the
  list always reflects the current database contents.

### 4. `/bookmarks` page
- Client component that fetches `/api/bookmarks` on mount (and on refresh) and
  renders the results inside a single live list container (`#bookmark-list`,
  `aria-live="polite"`).
- It renders an explicit empty state when the list is empty and a loading state
  while the first request is in flight.

## Consequences
- Future write endpoints must create rows that satisfy the `Bookmark` model
  (a `tags` value is required; pass `[]` for none).
- The API may later grow pagination/filtering without breaking the array contract
  for consumers that tolerate it; if a breaking envelope is ever needed it must be
  a new major slice with its own ADR.
- Any route handler that needs database access should import the shared singleton
  from `@/lib/prisma` rather than constructing `PrismaClient` directly, so tests
  can mock a single module.
