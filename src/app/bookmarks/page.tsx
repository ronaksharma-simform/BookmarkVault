'use client';

import { useCallback, useEffect, useState } from 'react';

type Bookmark = {
  id: string;
  title: string;
  url: string;
  tags: string[];
  createdAt: string;
};

/**
 * Live bookmarks list. It fetches GET /api/bookmarks on mount (and when the
 * user presses Refresh) and renders whatever the database currently holds.
 */
export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/bookmarks', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to load bookmarks (HTTP ${res.status})`);
      }
      const data = (await res.json()) as Bookmark[];
      setBookmarks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks');
    }
  }, []);

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks]);

  const isLoading = bookmarks === null && error === null;

  return (
    <main className="page">
      <header className="page-header">
        <h1>Bookmarks</h1>
        <nav className="page-actions">
          <a href="/bookmarks/new" className="add-bookmark-button">
            Add bookmark
          </a>
          <button
            type="button"
            className="refresh-button"
            onClick={() => void loadBookmarks()}
            disabled={isLoading}
          >
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>
        </nav>
      </header>

      <section
        id="bookmark-list"
        className="bookmark-list"
        aria-live="polite"
        aria-busy={isLoading}
      >
        {isLoading && <p className="bookmark-empty">Loading bookmarks…</p>}

        {error !== null && (
          <p className="bookmark-error" role="alert">
            {error}
            <button type="button" className="refresh-button" onClick={() => void loadBookmarks()}>
              Try again
            </button>
          </p>
        )}

        {!isLoading && error === null && bookmarks !== null && bookmarks.length === 0 && (
          <p className="bookmark-empty">No bookmarks yet — save your first bookmark to see it here.</p>
        )}

        {!isLoading && error === null && bookmarks !== null && bookmarks.length > 0 && (
          <ul className="bookmark-items">
            {bookmarks.map((bookmark) => (
              <li key={bookmark.id} className="bookmark-item">
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="bookmark-link"
                >
                  <span className="bookmark-title">{bookmark.title}</span>
                  <span className="bookmark-url">{bookmark.url}</span>
                </a>
                {bookmark.tags.length > 0 && (
                  <ul className="bookmark-tags" aria-label="Tags">
                    {bookmark.tags.map((tag) => (
                      <li key={tag} className="bookmark-tag">
                        {tag}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
