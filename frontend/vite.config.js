import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = (env.VITE_API_BASE_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/images': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
