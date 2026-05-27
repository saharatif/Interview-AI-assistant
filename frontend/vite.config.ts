import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  envDir: path.resolve(__dirname, '..'),
  server: {
    port: 5173,
  },
});
