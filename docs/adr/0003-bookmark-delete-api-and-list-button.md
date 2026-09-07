# ADR 0003: DELETE /api/bookmarks/:id and the list delete button

- Status: Accepted
- Date: 2025-01-01 (slice: "Delete a bookmark from the list page")

## Context

ADR 0001 introduced the read path (`GET /api/bookmarks`, `/bookmarks`) and ADR
0002 the first write path (`POST /api/bookmarks`, `/bookmarks/new`). This slice
adds deletion: a `DELETE /api/bookmarks/:id` endpoint that removes one row, and
a delete button on every row of the `/bookmarks` list that calls that endpoint
and drops the row from the list.

## Decisions

### 1. `DELETE /api/bookmarks/:id` contract
- Deleting an existing bookmark responds **`204` with no body and no
  `Content-Type`** header (an empty 204 — never a JSON body, which 204 forbids).
- Deleting a bookmark that does not exist responds **`404`** with
  `{ "error": "Bookmark not found." }`, so clients can distinguish "already
  gone" from success.
- The handler awaits the route `params` (`{ params }: { params: Promise<{ id: string }> }`)
  as required by the Next.js 15 App Router async request APIs.
- The delete goes through the shared `@/lib/prisma` singleton via
  `prisma.bookmark.deleteMany({ where: { id } })` and checks the returned
  `count`. `deleteMany` is used instead of `delete` so an unknown id surfaces
  as a plain zero-count result rather than a Prisma P2025 exception that the
  route would have to map.

### 2. List page: one delete button per row that removes the row locally
- The `/bookmarks` page fetches the list as before (ADR 0001) and each row now
  renders a **delete button** (`class="delete-bookmark-button"`, labelled
  `aria-label="Delete bookmark: <title>"`). The row markup lives in a small
  presentational component (`bookmark-item.tsx`) so rows can be rendered and
  asserted in the repo's `node`-environment Vitest setup (static markup via
  `react-dom/server`), which has no DOM to click buttons in.
- Clicking Delete calls `DELETE /api/bookmarks/<id>` with the id URL-encoded.
  On a **204** the page removes the row from its local state
  (`setBookmarks(current => current.filter(...))`) — no redirect and no
  refetch: writes stay decoupled from reads (ADR 0002 pattern), and a failed
  request leaves the row in place.
- While a delete request is in flight that row's button is disabled
  (`Deleting…`) and the Refresh button is disabled, preventing a double-delete
  race (the second request would 404 after the first succeeds). On failure the
  error surfaces in the existing page-level error banner and the rest of the
  list stays visible.
- Emptying the list falls back to the existing "No bookmarks yet" empty state
  with no page change.

## Consequences
- Clients of the API know a successful delete is a body-less 204 and can
  remove the row from any locally held copy; a 404 means the id is not (or no
  longer) present.
- The `bookmark-item.tsx` row component is the single place the list row
  markup (link, tags, delete button) is defined; future edit affordances can
  be added there without touching the fetch logic in `page.tsx`.
- Deleting satisfies the `Bookmark` model trivially (removal, not mutation);
  no schema change was needed.
