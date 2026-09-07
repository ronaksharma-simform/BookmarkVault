import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() })
}));

import NewBookmarkPage from './page';

describe('/bookmarks/new add-bookmark form', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('renders title, url and tags inputs inside a form', () => {
    const html = renderToStaticMarkup(createElement(NewBookmarkPage));

    expect(html).toContain('<form');
    expect(html).toContain('name="title"');
    expect(html).toContain('name="url"');
    expect(html).toContain('name="tags"');
  });
});
