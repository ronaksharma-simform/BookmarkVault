import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBookmark, validateUrl } from '../src/bookmark.js';
import { ValidationError } from '../src/errors.js';

test('valid URL produces a bookmark', () => {
  const b = createBookmark({ url: 'https://example.com', title: ' Example ' });
  assert.equal(typeof b.id, 'string');
  assert.ok(b.id.length > 0);
  assert.equal(b.url, 'https://example.com');
  assert.equal(b.title, 'Example');
  assert.equal(new Date(b.createdAt).toISOString(), b.createdAt);
});

test('title falls back to the URL', () => {
  assert.equal(createBookmark({ url: 'https://example.com' }).title, 'https://example.com');
  assert.equal(createBookmark({ url: 'https://example.com', title: '  ' }).title, 'https://example.com');
});

test('invalid URLs throw ValidationError', () => {
  for (const bad of ['', '   ', undefined, null, 42, 'not a url', 'ftp://x.com', 'http://']) {
    assert.throws(() => validateUrl(bad), ValidationError, `expected ${String(bad)} to fail`);
    assert.throws(() => createBookmark({ url: bad }), ValidationError);
  }
});

test('error messages are clear', () => {
  assert.throws(() => validateUrl(''), { message: 'URL must not be empty' });
  assert.throws(() => validateUrl('not a url'), { message: 'Invalid URL: "not a url"' });
});
