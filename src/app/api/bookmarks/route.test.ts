import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindMany, mockCreate } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCreate: vi.fn()
}));

// Replace the shared Prisma singleton so the route can be exercised without a
// live database. The route is the only consumer of this module.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    bookmark: {
      findMany: mockFindMany,
      create: mockCreate
    }
  }
}));

import { GET, POST } from './route';

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

/** Builds the GET request Next.js passes for the given query string ('' = none). */
function getRequest(query = ''): Request {
  const search = query === '' ? '' : `?${query}`;
  return new Request(`http://localhost/api/bookmarks${search}`);
}

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/bookmarks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('GET /api/bookmarks', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockFindMany.mockResolvedValue([]);
  });

  it('returns newest first', async () => {
    mockFindMany.mockResolvedValue([newest, middle, oldest]);

    const res = await GET(getRequest());

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
    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    const body = (await res.json()) as BookmarkRow[];
    expect(body).toEqual([]);
  });

  it('filters by tag, letting the database pick the matching rows', async () => {
    // The database receives a `tags has` predicate for the requested tag and
    // returns only the rows that carry it.
    mockFindMany.mockResolvedValue([middle]);

    const res = await GET(getRequest('tag=framework'));

    expect(res.status).toBe(200);
    const body = (await res.json()) as BookmarkRow[];
    expect(body.map((bookmark) => bookmark.id)).toEqual(['cm-bookmark-2']);

    // Filtering must happen in the database query, not in memory.
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { tags: { has: 'framework' } },
      orderBy: { createdAt: 'desc' }
    });
  });

  it('filters by tag with an exact match on the stored tag value', async () => {
    // A tag query must be matched against whole stored tags: 'docs' matches
    // the row tagged 'docs' but not a row tagged 'reference'.
    mockFindMany.mockResolvedValue([newest]);

    const res = await GET(getRequest('tag=docs'));

    expect(res.status).toBe(200);
    const body = (await res.json()) as BookmarkRow[];
    expect(body.map((bookmark) => bookmark.id)).toEqual(['cm-bookmark-3']);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { tags: { has: 'docs' } },
      orderBy: { createdAt: 'desc' }
    });
  });

  it('filters by tag and returns an empty list when no bookmark has that tag', async () => {
    mockFindMany.mockResolvedValue([]);

    const res = await GET(getRequest('tag=unknown'));

    expect(res.status).toBe(200);
    const body = (await res.json()) as BookmarkRow[];
    expect(body).toEqual([]);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { tags: { has: 'unknown' } },
      orderBy: { createdAt: 'desc' }
    });
  });

  it('treats an absent or blank tag as "no filter"', async () => {
    mockFindMany.mockResolvedValue([newest, middle, oldest]);

    // Absent tag, empty tag and whitespace-only tag all return the full list.
    const res = await GET(getRequest('tag='));
    expect(res.status).toBe(200);
    const body = (await res.json()) as BookmarkRow[];
    expect(body.map((bookmark) => bookmark.id)).toEqual([
      'cm-bookmark-3',
      'cm-bookmark-2',
      'cm-bookmark-1'
    ]);

    expect(mockFindMany).toHaveBeenLastCalledWith({ orderBy: { createdAt: 'desc' } });

    const whitespaceRes = await GET(getRequest('tag=%20%20'));
    expect(whitespaceRes.status).toBe(200);
    expect(mockFindMany).toHaveBeenLastCalledWith({ orderBy: { createdAt: 'desc' } });
  });
});

describe('POST /api/bookmarks', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockCreate.mockReset();
  });

  it('POST persists and is retrievable', async () => {
    // Simulate a real database: create() inserts into a store that findMany()
    // (i.e. the list API) later reads from, newest first.
    const store: BookmarkRow[] = [];
    mockFindMany.mockImplementation(async () => store);
    mockCreate.mockImplementation(async ({ data }) => {
      const created: BookmarkRow = {
        id: 'cm-bookmark-4',
        title: data.title,
        url: data.url,
        tags: data.tags,
        createdAt: '2025-03-01T12:00:00.000Z'
      };
      store.unshift(created);
      return created;
    });

    const res = await POST(
      jsonRequest({
        title: 'Vitest',
        url: 'https://vitest.dev',
        tags: ['testing', 'node']
      })
    );

    expect(res.status).toBe(201);
    expect(res.headers.get('content-type')).toContain('application/json');

    const created = (await res.json()) as BookmarkRow;
    expect(created).toEqual({
      id: 'cm-bookmark-4',
      title: 'Vitest',
      url: 'https://vitest.dev',
      tags: ['testing', 'node'],
      createdAt: '2025-03-01T12:00:00.000Z'
    });

    // The row must be persisted through the shared Prisma singleton with the
    // submitted title, url and tags.
    expect(mockCreate).toHaveBeenCalledWith({
      data: { title: 'Vitest', url: 'https://vitest.dev', tags: ['testing', 'node'] }
    });

    // The bookmark created above is retrievable from the list API afterward.
    const listRes = await GET(getRequest());
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as BookmarkRow[];
    expect(list).toContainEqual(created);
  });

  it('creates a bookmark without tags as an empty tags array', async () => {
    mockCreate.mockResolvedValue({
      id: 'cm-bookmark-5',
      title: 'Plain Link',
      url: 'https://example.com',
      tags: [],
      createdAt: '2025-03-02T09:00:00.000Z'
    });

    const res = await POST(
      jsonRequest({ title: 'Plain Link', url: 'https://example.com' })
    );

    expect(res.status).toBe(201);
    const created = (await res.json()) as BookmarkRow;
    expect(created.tags).toEqual([]);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { title: 'Plain Link', url: 'https://example.com', tags: [] }
    });
  });

  it('rejects a payload that is missing title or url with 400', async () => {
    const missingUrl = await POST(jsonRequest({ title: 'No URL' }));
    expect(missingUrl.status).toBe(400);
    const missingUrlBody = (await missingUrl.json()) as { error: string };
    expect(missingUrlBody.error).toContain('title and url');

    const missingTitle = await POST(jsonRequest({ url: 'https://example.com' }));
    expect(missingTitle.status).toBe(400);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects tags that are not an array of strings with 400', async () => {
    const res = await POST(
      jsonRequest({ title: 'Bad tags', url: 'https://example.com', tags: 'docs' })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('tags');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a non-JSON body with 400', async () => {
    const res = await POST(
      new Request('http://localhost/api/bookmarks', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'not json'
      })
    );

    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
