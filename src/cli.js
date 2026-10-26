#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BookmarkStore } from './store.js';
import { NotFoundError, StorageError, ValidationError } from './errors.js';

const USAGE = `Usage:
  bookmarkvault add <url> [title...]
  bookmarkvault list
  bookmarkvault delete <id>`;

/**
 * Run the CLI. Returns the process exit code.
 */
export function run(argv, store, out, err) {
  const [command, ...args] = argv;
  try {
    switch (command) {
      case 'add': {
        if (args.length < 1) break;
        const [url, ...titleParts] = args;
        const bookmark = store.add({ url, title: titleParts.join(' ') });
        out(JSON.stringify(bookmark, null, 2));
        return 0;
      }
      case 'list': {
        const bookmarks = store.list();
        if (bookmarks.length === 0) {
          out('No bookmarks.');
        } else {
          for (const b of bookmarks) {
            out(`${b.id}  ${b.createdAt}  ${b.title}  ${b.url}`);
          }
        }
        return 0;
      }
      case 'delete': {
        if (args.length !== 1) break;
        const removed = store.delete(args[0]);
        out(`Deleted bookmark ${removed.id} (${removed.title})`);
        return 0;
      }
      default:
        break;
    }
  } catch (e) {
    if (
      e instanceof ValidationError ||
      e instanceof NotFoundError ||
      e instanceof StorageError
    ) {
      err(`Error: ${e.message}`);
      return 1;
    }
    throw e;
  }
  err(USAGE);
  return 2;
}

function isMain() {
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMain()) {
  process.exitCode = run(
    process.argv.slice(2),
    new BookmarkStore(),
    (s) => console.log(s),
    (s) => console.error(s)
  );
}
