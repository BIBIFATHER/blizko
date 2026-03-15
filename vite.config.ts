import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const sentryPlugin = process.env.SENTRY_AUTH_TOKEN
  ? sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      sourcemaps: {
        // Limit uploads to browser bundles so Vercel's server artifacts do not
        // generate noisy "no sourcemap found" warnings during deploys.
        assets: ['./dist/assets/**', './dist/sw.js'],
      },
    })
  : null;

export default defineConfig({
  plugins: [react(), ...(sentryPlugin ? [sentryPlugin] : [])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://ai-proxy.blizko-ai.workers.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('@supabase')) {
            return 'supabase-vendor';
          }
          if (id.includes('lucide-react')) {
            return 'icons-vendor';
          }
          return undefined;
        },
      },
    },
  },
});
