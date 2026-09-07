import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import BookmarkItem, { type Bookmark } from './bookmark-item';

const bookmarks: Bookmark[] = [
  {
    id: 'cm-bookmark-1',
    title: 'Prisma Docs',
    url: 'https://www.prisma.io/docs',
    tags: ['docs', 'database'],
    createdAt: '2025-02-03T10:00:00.000Z'
  },
  {
    id: 'cm-bookmark-2',
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    tags: [],
    createdAt: '2025-01-01T09:00:00.000Z'
  }
];

describe('/bookmarks bookmark rows', () => {
  it('renders delete button', () => {
    // Render the rows the list page would render, one BookmarkItem per bookmark.
    const html = renderToStaticMarkup(
      createElement(
        'ul',
        null,
        bookmarks.map((bookmark) =>
          createElement(BookmarkItem, {
            key: bookmark.id,
            bookmark,
            onDelete: vi.fn()
          })
        )
      )
    );

    const rows = html.split('<li class="bookmark-item">').slice(1);

    // Every bookmark renders as a row, and every row contains a delete button.
    expect(rows).toHaveLength(bookmarks.length);
    for (const row of rows) {
      expect(row).toContain('delete-bookmark-button');
    }

    // The button is an explicit delete control per bookmark, labelled with the
    // bookmark it removes.
    expect(html).toContain('aria-label="Delete bookmark: Prisma Docs"');
    expect(html).toContain('aria-label="Delete bookmark: MDN Web Docs"');
    expect(html).toContain('>Delete</button>');
  });
});
