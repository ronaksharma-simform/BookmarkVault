import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }));

// Replace the shared Prisma singleton so the route can be exercised without a
// live database. The route is the only consumer of this module.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    bookmark: {
      findMany: mockFindMany
    }
  }
}));

import { GET } from './route';

type BookmarkRow = {
  id: string;
  title: string;
  url: string;
  tags: string[];
  createdAt: string;
};

const newest: BookmarkRow = {
  id: 'cm-bookmark-3',
  title: 'Prisma Docs',
  url: 'https://www.prisma.io/docs',
  tags: ['docs', 'database'],
  createdAt: '2025-02-03T10:00:00.000Z'
};

const middle: BookmarkRow = {
  id: 'cm-bookmark-2',
  title: 'Next.js App Router',
  url: 'https://nextjs.org/docs/app',
  tags: ['framework'],
  createdAt: '2025-01-20T08:30:00.000Z'
};

const oldest: BookmarkRow = {
  id: 'cm-bookmark-1',
  title: 'MDN Web Docs',
  url: 'https://developer.mozilla.org',
  tags: ['reference'],
  createdAt: '2025-01-01T09:00:00.000Z'
};

describe('GET /api/bookmarks', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockFindMany.mockResolvedValue([]);
  });

  it('returns newest first', async () => {
    mockFindMany.mockResolvedValue([newest, middle, oldest]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');

    const body = (await res.json()) as BookmarkRow[];
    expect(body.map((bookmark) => bookmark.id)).toEqual([
      'cm-bookmark-3',
      'cm-bookmark-2',
      'cm-bookmark-1'
    ]);

    // The newest-first ordering must happen in the database query, not in memory.
    expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
  });

  it('returns an empty list when there are no bookmarks', async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    const body = (await res.json()) as BookmarkRow[];
    expect(body).toEqual([]);
  });
});
