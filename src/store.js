import fs from 'node:fs';
import path from 'node:path';
import { createBookmark } from './bookmark.js';
import { NotFoundError, StorageError } from './errors.js';

const DEFAULT_FILE = path.join('data', 'bookmarks.json');

export class BookmarkStore {
  #filePath;

  constructor(filePath = process.env.BOOKMARKVAULT_FILE || DEFAULT_FILE) {
    this.#filePath = filePath;
  }

  get filePath() {
    return this.#filePath;
  }

  #read() {
    let raw;
    try {
      raw = fs.readFileSync(this.#filePath, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') return [];
      throw new StorageError(
        `Could not read ${this.#filePath}: ${e.message}`
      );
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new StorageError(`Corrupt data file ${this.#filePath}: invalid JSON`);
    }
    if (!Array.isArray(data)) {
      throw new StorageError(
        `Corrupt data file ${this.#filePath}: expected a JSON array`
      );
    }
    return data;
  }

  #write(list) {
    const tmp = `${this.#filePath}.${process.pid}.tmp`;
    try {
      fs.mkdirSync(path.dirname(this.#filePath), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(list, null, 2) + '\n', 'utf8');
      fs.renameSync(tmp, this.#filePath);
    } catch (e) {
      fs.rmSync(tmp, { force: true });
      throw new StorageError(
        `Could not write ${this.#filePath}: ${e.message}`
      );
    }
  }

  add({ url, title } = {}) {
    // Throws before any write if the URL is invalid.
    const bookmark = createBookmark({ url, title });
    const list = this.#read();
    list.push(bookmark);
    this.#write(list);
    return bookmark;
  }

  list() {
    // Array.prototype.sort is stable, so insertion order breaks ties.
    return this.#read().sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
    );
  }

  delete(id) {
    const list = this.#read();
    const index = list.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new NotFoundError(`No bookmark with id "${id}"`);
    }
    const [removed] = list.splice(index, 1);
    this.#write(list);
    return removed;
  }
}
