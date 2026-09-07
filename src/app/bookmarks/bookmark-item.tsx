export type Bookmark = {
  id: string;
  title: string;
  url: string;
  tags: string[];
  createdAt: string;
};

type BookmarkItemProps = {
  bookmark: Bookmark;
  /** Called when the user asks to delete this bookmark (e.g. DELETE /api/bookmarks/:id). */
  onDelete: (id: string) => void;
  /** True while this bookmark's DELETE request is in flight; disables the button. */
  isDeleting?: boolean;
};

/**
 * One bookmark row in the list. Renders the link, its tags, and a delete
 * button for the bookmark; the parent owns the data and the DELETE call, this
 * component only reports the intent through `onDelete`.
 */
export default function BookmarkItem({ bookmark, onDelete, isDeleting = false }: BookmarkItemProps) {
  return (
    <li className="bookmark-item">
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
      <button
        type="button"
        className="delete-bookmark-button"
        onClick={() => onDelete(bookmark.id)}
        disabled={isDeleting}
        aria-label={`Delete bookmark: ${bookmark.title}`}
      >
        {isDeleting ? 'Deleting…' : 'Delete'}
      </button>
    </li>
  );
}
