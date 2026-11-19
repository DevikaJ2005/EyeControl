import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // COOP/COEP are required for SharedArrayBuffer used by MediaPipe WASM.
    // Note: These headers will block cross-origin iframes (YouTube embeds).
    // The ExplorePage video embeds use youtube-nocookie.com which is exempt
    // from COEP in modern Chrome. If embeds are blocked, remove these two lines
    // and reload. MediaPipe will fall back to the non-SharedArrayBuffer WASM path.
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Exclude Playwright browser spec files from Vitest — run those with: npx playwright test
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
  },
});
