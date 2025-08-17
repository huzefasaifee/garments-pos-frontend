// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react({ babel: { plugins: ['babel-plugin-react-compiler'] } })],
  server: { port: 3000 },                 // keep CRA’s port if you like
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } } // nice-to-have
});
