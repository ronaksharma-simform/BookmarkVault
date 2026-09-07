'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import BookmarkItem, { type Bookmark } from './bookmark-item';

/** Builds the list URL, adding `?tag=` only when a tag filter is present. */
function bookmarkListUrl(tag: string): string {
  const trimmed = tag.trim();
  if (trimmed === '') {
    return '/api/bookmarks';
  }
  const search = new URLSearchParams({ tag: trimmed });
  return `/api/bookmarks?${search.toString()}`;
}

/**
 * Live bookmarks list. It fetches GET /api/bookmarks on mount (and when the
 * user presses Refresh) and renders whatever the database currently holds.
 *
 * The tag filter input re-queries the API with `?tag=<tag>` as the user types
 * (or clears the filter to fetch the full list again). Each new request aborts
 * the previous in-flight one, so the rendered list always matches the newest
 * filter even when responses arrive out of order.
 *
 * Each row's delete button calls DELETE /api/bookmarks/:id and removes the
 * row from the list once the API confirms with 204.
 */
export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
  const [tagFilter, setTagFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadBookmarks = useCallback(async (tag: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    try {
      const res = await fetch(bookmarkListUrl(tag), {
        cache: 'no-store',
        signal: controller.signal
      });
      if (!res.ok) {
        throw new Error(`Failed to load bookmarks (HTTP ${res.status})`);
      }
      const data = (await res.json()) as Bookmark[];
      setBookmarks(data);
    } catch (err) {
      if (controller.signal.aborted) {
        // A newer request superseded this one; keep its results instead.
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks');
    }
  }, []);

  useEffect(() => {
    void loadBookmarks('');
  }, [loadBookmarks]);

  const handleTagFilterChange = useCallback(
    (value: string) => {
      setTagFilter(value);
      void loadBookmarks(value);
    },
    [loadBookmarks]
  );

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
  const activeTag = tagFilter.trim();

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
            onClick={() => void loadBookmarks(tagFilter)}
            disabled={isLoading || deletingId !== null}
          >
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>
        </nav>
      </header>

      <div className="tag-filter">
        <label htmlFor="tag-filter-input">Filter by tag</label>
        <input
          id="tag-filter-input"
          name="tag-filter"
          type="text"
          value={tagFilter}
          onChange={(event) => handleTagFilterChange(event.target.value)}
          placeholder="e.g. docs"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

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
            <button type="button" className="refresh-button" onClick={() => void loadBookmarks(tagFilter)}>
              Try again
            </button>
          </p>
        )}

        {!isLoading && error === null && bookmarks !== null && bookmarks.length === 0 && (
          <p className="bookmark-empty">
            {activeTag === ''
              ? 'No bookmarks yet — save your first bookmark to see it here.'
              : `No bookmarks match the tag "${activeTag}".`}
          </p>
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
