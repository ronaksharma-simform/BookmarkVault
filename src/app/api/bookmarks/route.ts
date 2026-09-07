import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// The bookmarks list must always reflect the current database contents.
export const dynamic = 'force-dynamic';

/**
 * Parses the `tags` field of a POST payload.
 * - `undefined` means "no tags" and becomes an empty array.
 * - Otherwise the value must be an array of strings; blank entries are dropped.
 * - Returns `null` when the value is present but not an array of strings.
 */
function parseTags(value: unknown): string[] | null {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const tags: string[] = [];
  for (const tag of value) {
    if (typeof tag !== 'string') {
      return null;
    }
    const trimmed = tag.trim();
    if (trimmed !== '') {
      tags.push(trimmed);
    }
  }
  return tags;
}

/**
 * GET /api/bookmarks?tag=<tag>
 * Returns bookmarks as a JSON array, newest first (empty array when the
 * database has no bookmarks yet). When a non-blank `tag` query parameter is
 * present, only bookmarks whose `tags` include that exact tag are returned;
 * an absent or blank `tag` returns the full list.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const tag = (searchParams.get('tag') ?? '').trim();

  const bookmarks = await prisma.bookmark.findMany({
    ...(tag !== '' ? { where: { tags: { has: tag } } } : {}),
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(bookmarks, {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

/**
 * POST /api/bookmarks
 * Creates a bookmark from a JSON body `{ title, url, tags? }` and responds
 * with the persisted row (201). `title` and `url` must be non-empty strings;
 * `tags` is an optional array of strings (defaults to `[]`).
 */
export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const input =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : {};

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const url = typeof input.url === 'string' ? input.url.trim() : '';

  if (title === '' || url === '') {
    return NextResponse.json(
      { error: 'title and url are required non-empty strings.' },
      { status: 400 }
    );
  }

  const tags = parseTags(input.tags);
  if (tags === null) {
    return NextResponse.json(
      { error: 'tags must be an array of strings.' },
      { status: 400 }
    );
  }

  const bookmark = await prisma.bookmark.create({
    data: { title, url, tags }
  });

  return NextResponse.json(bookmark, {
    status: 201,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
