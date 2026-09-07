# BookmarkVault

Save, tag and organise your bookmarks.

## Stack

- [Next.js](https://nextjs.org) (App Router, `src/` layout) + React
- [Prisma](https://www.prisma.io) ORM with PostgreSQL (`prisma/schema.prisma`)
- [Vitest](https://vitest.dev) for unit tests
- TypeScript (strict)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure the database
cp .env.example .env   # then set DATABASE_URL to your PostgreSQL instance

# 3. Generate the Prisma client and apply migrations
npm run db:generate
npm run db:migrate

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000/bookmarks to see the live bookmarks list (it shows
an empty state until bookmarks exist). Open http://localhost:3000/bookmarks/new
to save a bookmark from the add-bookmark form.

## Available routes

| Route                     | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| `GET /api/bookmarks`      | JSON array of bookmarks from the database, newest first (`[]` when empty) |
| `POST /api/bookmarks`     | Creates a bookmark from `{ title, url, tags? }` (JSON body); returns `201` with the persisted bookmark |
| `/bookmarks`              | Live list container that fetches `/api/bookmarks` and renders an empty state |
| `/bookmarks/new`          | Add-bookmark form (title, url, tags) that POSTs to `/api/bookmarks` and redirects to `/bookmarks` |

## Tests

```bash
npm test                                   # run the full suite
npx vitest run src/app/api/bookmarks/route.test.ts -t "POST persists and is retrievable"
```

## Database

The Prisma schema is the source of truth for the `Bookmark` model. Migrations
are checked in under `prisma/migrations/`; apply them with `npm run db:migrate`.

See `docs/adr/0001-bookmark-model-and-list-api.md` for the model and API contract
decisions.
