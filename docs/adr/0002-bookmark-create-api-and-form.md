# ADR 0002: POST /api/bookmarks and the add-bookmark form

- Status: Accepted
- Date: 2025-01-01 (slice: "Create bookmarks from the new-bookmark form")

## Context

ADR 0001 introduced the `Bookmark` model and the read path (`GET /api/bookmarks`,
`/bookmarks`). This slice adds the first write path: `POST /api/bookmarks` creates
a bookmark row from a submitted title, url and tags, and a `/bookmarks/new` form
collects those values, submits them to the API and redirects back to the list.

## Decisions

### 1. `POST /api/bookmarks` contract
- Request body is JSON: `{ "title": string, "url": string, "tags"?: string[] }`.
  `title` and `url` are trimmed; `tags` is optional and defaults to `[]` (an
  omitted field means "no tags", matching the model in ADR 0001). Blank tag
  entries are dropped.
- The handler validates the payload and responds `400` with
  `{ "error": "..." }` for a non-JSON body, missing/blank `title` or `url`, or a
  `tags` value that is not an array of strings. No row is created in those cases.
- A successful insert responds **`201`** with the persisted bookmark as the JSON
  body (same shape as a `GET` list item, including the server-generated `id` and
  `createdAt`). No Location header or server-side redirect: the API stays a pure
  JSON endpoint so future API clients get a predictable contract.
- The write goes through the shared `@/lib/prisma` singleton (as required by
  ADR 0001) via `prisma.bookmark.create({ data: { title, url, tags } })`.

### 2. `/bookmarks/new` page
- A client component ("use client") that renders a form with three inputs named
  `title`, `url` and `tags` (plus a submit button labelled "Save bookmark").
- On submit the page POSTs a JSON body to `/api/bookmarks` with
  `fetch('/api/bookmarks', { method: 'POST', ... })` and, on a `201`, redirects
  to `/bookmarks` with the router (`router.push('/bookmarks')`). On a validation
  or network error it stays on the form and shows the API error message.
- The `tags` input is a single text field of comma-separated values; the page
  splits/trims it into the `string[]` the API expects.
- The page adds `https://` when the submitted URL has no scheme so stored links
  always open correctly. The URL is otherwise stored exactly as submitted.
- The `/bookmarks` list header gains an "Add bookmark" link pointing here so the
  flow is reachable from the list.

## Consequences
- The `/bookmarks` page needs no change to reflect new bookmarks: after the
  redirect it remounts, fetches `GET /api/bookmarks` and shows the created row
  (the POST→redirect→GET flow keeps reads and writes decoupled).
- Creating a bookmark always satisfies the `Bookmark` model because `tags` is
  guaranteed non-null (the handler coerces an omitted field to `[]`).
- Future edit/delete routes follow the same pattern: mutate through the shared
  Prisma singleton, return the persisted resource (or appropriate status), and
  let the client redirect.
