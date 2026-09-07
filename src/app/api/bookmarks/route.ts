import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// The bookmarks list must always reflect the current database contents.
export const dynamic = 'force-dynamic';

/**
 * GET /api/bookmarks
 * Returns all bookmarks as a JSON array, newest first (empty array when the
 * database has no bookmarks yet).
 */
export async function GET(): Promise<NextResponse> {
  const bookmarks = await prisma.bookmark.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(bookmarks, {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
