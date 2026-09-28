import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: {
    // During local dev, forward API calls to the Cloud Run backend running on :8080
    proxy: { '/api': 'http://localhost:8080' },
  },
});
