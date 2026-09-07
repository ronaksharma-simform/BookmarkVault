import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}']
  },
  esbuild: {
    // Match Next.js: transform JSX with the automatic runtime so client
    // components do not need to import React.
    jsx: 'automatic'
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src')
    }
  }
});
