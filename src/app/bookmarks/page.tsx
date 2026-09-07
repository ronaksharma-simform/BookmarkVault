'use client';

import { useCallback, useEffect, useState } from 'react';

import BookmarkItem, { type Bookmark } from './bookmark-item';

/**
 * Live bookmarks list. It fetches GET /api/bookmarks on mount (and when the
 * user presses Refresh) and renders whatever the database currently holds.
 * Each row's delete button calls DELETE /api/bookmarks/:id and removes the
 * row from the list once the API confirms with 204.
 */
export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = useCallback(async (id: string) => {
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/bookmarks/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error(`Failed to delete bookmark (HTTP ${res.status})`);
      }
      setBookmarks((current) =>
        (current ?? []).filter((bookmark) => bookmark.id !== id)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bookmark');
    } finally {
      setDeletingId(null);
    }
  }, []);

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
            disabled={isLoading || deletingId !== null}
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

        {bookmarks !== null && bookmarks.length > 0 && (
          <ul className="bookmark-items">
            {bookmarks.map((bookmark) => (
              <BookmarkItem
                key={bookmark.id}
                bookmark={bookmark}
                onDelete={(id) => void handleDelete(id)}
                isDeleting={deletingId === bookmark.id}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
