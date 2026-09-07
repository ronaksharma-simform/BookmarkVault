import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/bookmarks/:id
 * Deletes the bookmark with the given id and responds 204 with no body.
 * When no bookmark with that id exists the response is 404 with a JSON
 * error, so clients can tell a genuine "already gone" from a success.
 *
 * Uses `deleteMany` (rather than `delete`) so an unknown id is a plain
 * zero-count result instead of a Prisma "record not found" exception.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  const deleted = await prisma.bookmark.deleteMany({ where: { id } });
  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Bookmark not found.' }, { status: 404 });
  }

  // 204 must not carry a body or a Content-Type header.
  return new Response(null, { status: 204 });
}
