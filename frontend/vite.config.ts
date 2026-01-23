import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use LocalStack ALB for local dev (API Gateway behind the load balancer)
const DEFAULT_GATEWAY = 'http://lb-6078f78a.elb.localhost.localstack.cloud:4004';

// Dev proxy so the frontend can call /auth/* and /api/* without CORS headaches.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: process.env.VITE_DEV_PROXY_TARGET ?? DEFAULT_GATEWAY,
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_DEV_PROXY_TARGET ?? DEFAULT_GATEWAY,
        changeOrigin: true,
      },
      '/api-docs': {
        target: process.env.VITE_DEV_PROXY_TARGET ?? DEFAULT_GATEWAY,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
