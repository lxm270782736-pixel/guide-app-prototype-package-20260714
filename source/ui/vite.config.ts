import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load .env from project root (one level up from ui/)
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const backendPort = parseInt(env.BACKEND_PORT ?? '17659');
  const frontendPort = parseInt(env.FRONTEND_PORT ?? '3500');

  return {
    plugins: [react()],

    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, './src') },
      ],
    },

    // 部署到 GitHub Pages 时通过环境变量传入子路径，本地开发保持根路径
    base: process.env.PAGES_BASE ?? '/',

    server: {
      port: frontendPort,
      host: true,
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },

    // Inject port constants into the browser bundle at build time
    define: {
      __BACKEND_PORT__: backendPort,
    },

    // @astribot/ui is a pre-built package; exclude it from vite's dep optimizer
    // to prevent it trying to resolve nested @radix-ui source files
    optimizeDeps: {
      exclude: ['@astribot/ui', '@astribot/stores'],
    },
  };
});
