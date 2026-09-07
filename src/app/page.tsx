import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="page home-hero">
      <h1>
        <span className="brand">BookmarkVault</span>
      </h1>
      <p>Save, tag and organise your bookmarks.</p>
      <p>
        <Link href="/bookmarks">Browse bookmarks</Link>
      </p>
    </main>
  );
}
