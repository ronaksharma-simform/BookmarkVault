import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run } from '../src/cli.js';
import { BookmarkStore } from '../src/store.js';

let dir;
let store;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookmarkvault-cli-'));
  store = new BookmarkStore(path.join(dir, 'bookmarks.json'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function exec(...argv) {
  const out = [];
  const err = [];
  const code = run(argv, store, (s) => out.push(s), (s) => err.push(s));
  return { code, out: out.join('\n'), err: err.join('\n') };
}

test('add, list and delete succeed', () => {
  const added = exec('add', 'https://example.com', 'My', 'Example');
  assert.equal(added.code, 0);
  const bookmark = JSON.parse(added.out);
  assert.equal(bookmark.title, 'My Example');

  const listed = exec('list');
  assert.equal(listed.code, 0);
  assert.ok(listed.out.includes(bookmark.id));
  assert.ok(listed.out.includes('https://example.com'));

  const deleted = exec('delete', bookmark.id);
  assert.equal(deleted.code, 0);
  assert.equal(exec('list').out, 'No bookmarks.');
});

test('invalid URL exits 1 with an error message', () => {
  const r = exec('add', 'foo');
  assert.equal(r.code, 1);
  assert.match(r.err, /^Error: /);
  assert.deepEqual(store.list(), []);
});

test('unknown id exits 1', () => {
  const r = exec('delete', 'missing');
  assert.equal(r.code, 1);
  assert.match(r.err, /^Error: No bookmark with id "missing"/);
});

test('unknown or missing command exits 2 with usage', () => {
  const r = exec('frobnicate');
  assert.equal(r.code, 2);
  assert.match(r.err, /Usage:/);
  assert.equal(exec().code, 2);
  assert.equal(exec('add').code, 2);
  assert.equal(exec('delete').code, 2);
});
