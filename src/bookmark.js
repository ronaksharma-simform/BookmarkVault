import { randomUUID } from 'node:crypto';
import { ValidationError } from './errors.js';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Validate a URL and return it trimmed.
 * Throws ValidationError if it is empty, malformed or not http(s).
 */
export function validateUrl(url) {
  if (typeof url !== 'string' || url.trim() === '') {
    throw new ValidationError('URL must not be empty');
  }
  const trimmed = url.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ValidationError(`Invalid URL: "${trimmed}"`);
  }
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new ValidationError(
      `Invalid URL: "${trimmed}" (only http and https are supported)`
    );
  }
  return trimmed;
}

/**
 * Build a new bookmark: { id, url, title, createdAt }.
 */
export function createBookmark({ url, title } = {}) {
  const validUrl = validateUrl(url);
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  return {
    id: randomUUID(),
    url: validUrl,
    title: cleanTitle || validUrl,
    createdAt: new Date().toISOString(),
  };
}
