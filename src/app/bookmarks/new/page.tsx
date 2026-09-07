'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/** Splits a comma-separated tags field into trimmed, non-empty tags. */
function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag !== '');
}

/** Ensures the submitted URL has a scheme so it opens correctly. */
function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * New-bookmark form. It POSTs the submitted title, url and tags to
 * /api/bookmarks and redirects to the /bookmarks list when the save succeeds.
 */
export default function NewBookmarkPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (title.trim() === '' || url.trim() === '') {
      setError('Title and URL are required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          url: normalizeUrl(url),
          tags: parseTags(tags)
        })
      });

      if (!res.ok) {
        let message = `Failed to save bookmark (HTTP ${res.status})`;
        try {
          const data = (await res.json()) as { error?: string };
          if (typeof data.error === 'string' && data.error !== '') {
            message = data.error;
          }
        } catch {
          // Keep the fallback message when the body is not JSON.
        }
        throw new Error(message);
      }

      router.push('/bookmarks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bookmark');
      setIsSaving(false);
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Add a bookmark</h1>
        <a href="/bookmarks" className="back-link">
          ← Back to bookmarks
        </a>
      </header>

      {error !== null && (
        <p className="bookmark-error" role="alert">
          {error}
        </p>
      )}

      <form className="bookmark-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="bookmark-title">Title</label>
          <input
            id="bookmark-title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Prisma Docs"
            autoFocus
          />
        </div>

        <div className="form-field">
          <label htmlFor="bookmark-url">URL</label>
          <input
            id="bookmark-url"
            name="url"
            type="text"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
          />
        </div>

        <div className="form-field">
          <label htmlFor="bookmark-tags">Tags</label>
          <input
            id="bookmark-tags"
            name="tags"
            type="text"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="e.g. docs, database (comma separated)"
          />
        </div>

        <button type="submit" className="submit-button" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save bookmark'}
        </button>
      </form>
    </main>
  );
}
