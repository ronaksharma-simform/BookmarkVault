# ADR 0004: Tag filter on GET /api/bookmarks and the list page

- Status: Accepted
- Date: 2025-01-01 (slice: "Filter bookmarks by tag on /bookmarks")

## Context

ADR 0001 fixed the read contract of `GET /api/bookmarks` as a plain JSON array,
newest first. Bookmarks carry a `tags` text array (ADR 0001) that is written via
`POST /api/bookmarks` (ADR 0002). This slice adds the first narrowing of the
read path: an optional `?tag=` query parameter that returns only bookmarks
carrying a given tag, plus a tag filter input on the `/bookmarks` page that
drives the API query. The database-level filtering keeps the client thin and
stays correct when the collection outgrows a single page.

## Decisions

### 1. `GET /api/bookmarks?tag=<tag>` contract
- The handler reads the `tag` search parameter from the request URL, trims it,
  and treats an absent or blank value as "no filter" (full list, as before).
- A non-blank `tag` is pushed down to the database as
  `where: { tags: { has: <tag> } }` — Prisma's array-contains predicate over
  the Postgres text array. Filtering happens in the query, never in memory.
- Matching is an **exact, case-sensitive match against a whole stored tag**
  (stored tags are trimmed at creation time, so the match is on the canonical
  value). One `tag` per request; repeated `?tag=` parameters are not
  accumulated.
- The response stays the ADR 0001 JSON array, still ordered newest first at the
  database level, still `force-dynamic` with `Cache-Control: no-store`.

### 2. `/bookmarks` page: tag filter input drives the API query
- A labelled text input (`name="tag-filter"`, id `tag-filter-input`) sits above
  the live list and holds the current filter text.
- Typing re-queries `GET /api/bookmarks?tag=<value>` immediately; clearing the
  input re-fetches the full list. The client encodes the tag with
  `URLSearchParams`, so tags containing spaces or reserved characters survive
  the round trip.
- Each new request **aborts the previous in-flight request** (AbortController),
  so the rendered list always reflects the newest filter even when responses
  resolve out of order; the existing row/empty/loading states are reused, with
  the empty state text distinguishing "no bookmarks at all" from "no bookmarks
  match this tag".
- Refresh and "Try again" keep the active filter: they re-issue the request for
  the current `tagFilter` value rather than an unconditioned list fetch.

## Consequences
- API clients can narrow the list without changing the array contract; the
  `?tag=` parameter is additive and safe to ignore.
- Because the match is exact and case-sensitive, a filter of `Docs` will not
  match a tag stored as `docs`; if case-insensitive matching is wanted later it
  is a deliberate follow-up (e.g. an `ILIKE`-style or normalized-tag approach),
  not a silent tweak of this predicate.
- The page's fetch is now parameterized by the filter; any future pagination or
  search field composes with the same `loadBookmarks` path and abort-on-change
  discipline.
