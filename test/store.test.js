import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BookmarkStore } from '../src/store.js';
import { NotFoundError, StorageError, ValidationError } from '../src/errors.js';

let dir;
let file;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookmarkvault-'));
  file = path.join(dir, 'nested', 'bookmarks.json');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

test('add stores a bookmark and returns it with a generated id', () => {
  const store = new BookmarkStore(file);
  const a = store.add({ url: 'https://a.com', title: 'A' });
  const b = store.add({ url: 'https://b.com', title: 'B' });
  assert.ok(a.id);
  assert.notEqual(a.id, b.id);
  assert.equal(a.url, 'https://a.com');
  assert.deepEqual(store.list().map((x) => x.id).sort(), [a.id, b.id].sort());
});

test('add with an invalid URL throws and stores nothing', () => {
  const store = new BookmarkStore(file);
  assert.throws(() => store.add({ url: 'nope' }), ValidationError);
  assert.throws(() => store.add({ url: '' }), ValidationError);
  assert.equal(fs.existsSync(file), false);

  store.add({ url: 'https://a.com' });
  assert.throws(() => store.add({ url: 'ftp://a.com' }), ValidationError);
  assert.equal(store.list().length, 1);
});

test('list returns bookmarks oldest first', () => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const mk = (id, createdAt) => ({ id, url: `https://${id}.com`, title: id, createdAt });
  fs.writeFileSync(
    file,
    JSON.stringify([
      mk('c', '2024-03-01T00:00:00.000Z'),
      mk('a', '2024-01-01T00:00:00.000Z'),
      mk('b', '2024-02-01T00:00:00.000Z'),
    ])
  );
  assert.deepEqual(new BookmarkStore(file).list().map((x) => x.id), ['a', 'b', 'c']);
});

test('list on an empty store returns []', () => {
  assert.deepEqual(new BookmarkStore(file).list(), []);
});

test('delete removes only the given bookmark', () => {
  const store = new BookmarkStore(file);
  const a = store.add({ url: 'https://a.com' });
  const b = store.add({ url: 'https://b.com' });
  const removed = store.delete(a.id);
  assert.equal(removed.id, a.id);
  assert.deepEqual(store.list().map((x) => x.id), [b.id]);
});

test('delete with an unknown id throws NotFoundError and changes nothing', () => {
  const store = new BookmarkStore(file);
  store.add({ url: 'https://a.com' });
  const before = fs.readFileSync(file, 'utf8');
  assert.throws(() => store.delete('missing'), (e) => {
    assert.ok(e instanceof NotFoundError);
    assert.equal(e.message, 'No bookmark with id "missing"');
    return true;
  });
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});

test('data survives a restart', () => {
  const first = new BookmarkStore(file);
  const added = first.add({ url: 'https://a.com', title: 'A' });
  const second = new BookmarkStore(file);
  assert.deepEqual(second.list(), [added]);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), [added]);
});

test('a corrupt file throws StorageError', () => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{not json');
  assert.throws(() => new BookmarkStore(file).list(), StorageError);
  fs.writeFileSync(file, '{"a":1}');
  assert.throws(() => new BookmarkStore(file).list(), StorageError);
});
