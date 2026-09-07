import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import BookmarksPage from './page';

describe('/bookmarks tag filter', () => {
  it('renders a tag filter input on the bookmarks page', () => {
    const html = renderToStaticMarkup(createElement(BookmarksPage));

    expect(html).toContain('name="tag-filter"');
  });

  it('labels the tag filter input accessibly', () => {
    const html = renderToStaticMarkup(createElement(BookmarksPage));

    // The input carries an id its label points at, so the filter control is
    // announced to assistive technology.
    expect(html).toContain('id="tag-filter-input"');
    expect(html).toContain('<label for="tag-filter-input">Filter by tag</label>');
  });

  it('keeps the list container the filter drives', () => {
    const html = renderToStaticMarkup(createElement(BookmarksPage));

    // Filtering re-queries into the same live list the page already renders.
    expect(html).toContain('id="bookmark-list"');
  });
});
