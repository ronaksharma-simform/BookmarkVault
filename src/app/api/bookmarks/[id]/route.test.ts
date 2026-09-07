import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindMany, mockDeleteMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockDeleteMany: vi.fn()
}));

// Replace the shared Prisma singleton so the route can be exercised without a
// live database. The route and the list route are the only consumers of this
// module.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    bookmark: {
      findMany: mockFindMany,
      deleteMany: mockDeleteMany
    }
  }
}));

import { DELETE } from './route';
import { GET } from '../route';

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

/** Builds the route context Next.js passes for /api/bookmarks/:id. */
function routeContext(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe('DELETE /api/bookmarks/:id', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockDeleteMany.mockReset();
  });

  it('DELETE removes from subsequent GET', async () => {
    // Simulate a real database: deleteMany() removes a row from the store that
    // findMany() (i.e. the list API) later reads from, newest first.
    const store: BookmarkRow[] = [newest, middle, oldest];
    mockFindMany.mockImplementation(async () => [...store]);
    mockDeleteMany.mockImplementation(async ({ where }) => {
      const index = store.findIndex((bookmark) => bookmark.id === where.id);
      if (index === -1) {
        return { count: 0 };
      }
      store.splice(index, 1);
      return { count: 1 };
    });

    const res = await DELETE(
      new Request('http://localhost/api/bookmarks/cm-bookmark-2', {
        method: 'DELETE'
      }),
      routeContext('cm-bookmark-2')
    );

    // A successful delete responds 204 with no body.
    expect(res.status).toBe(204);
    expect(res.headers.get('content-type')).toBeNull();

    // The delete must go through the shared Prisma singleton for that exact id.
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { id: 'cm-bookmark-2' } });

    // The bookmark deleted above is gone from the list API afterward, while the
    // remaining rows are untouched.
    const listRes = await GET();
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as BookmarkRow[];
    expect(list.map((bookmark) => bookmark.id)).toEqual([
      'cm-bookmark-3',
      'cm-bookmark-1'
    ]);
    expect(list).not.toContainEqual(middle);
  });

  it('deleting the only bookmark leaves an empty list', async () => {
    const store: BookmarkRow[] = [middle];
    mockFindMany.mockImplementation(async () => [...store]);
    mockDeleteMany.mockImplementation(async ({ where }) => {
      const index = store.findIndex((bookmark) => bookmark.id === where.id);
      if (index === -1) {
        return { count: 0 };
      }
      store.splice(index, 1);
      return { count: 1 };
    });

    const res = await DELETE(
      new Request('http://localhost/api/bookmarks/cm-bookmark-2', {
        method: 'DELETE'
      }),
      routeContext('cm-bookmark-2')
    );

    expect(res.status).toBe(204);

    const listRes = await GET();
    const list = (await listRes.json()) as BookmarkRow[];
    expect(list).toEqual([]);
  });

  it('responds 404 when no bookmark has that id', async () => {
    mockFindMany.mockResolvedValue([]);
    mockDeleteMany.mockResolvedValue({ count: 0 });

    const res = await DELETE(
      new Request('http://localhost/api/bookmarks/does-not-exist', {
        method: 'DELETE'
      }),
      routeContext('does-not-exist')
    );

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('not found');
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { id: 'does-not-exist' } });
  });
});
