import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [svelte()],
  build: { outDir: '../../dist/web', emptyOutDir: true },
});
