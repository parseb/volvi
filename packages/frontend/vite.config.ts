import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  preview: {
    port: parseInt(process.env.PORT || '8080'),
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: ['app.volvi.xyz', '.railway.app'],
  },
});
