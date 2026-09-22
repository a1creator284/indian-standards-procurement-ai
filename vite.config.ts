import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { apiDevPlugin } from './server/vite-plugin-api.ts';

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/@xyflow')) return 'graph';
          if (id.includes('node_modules/pdfjs-dist')) return 'pdf';
          if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
});
