import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    global: 'window',
    'process.env': {},
  },
  server: {
    proxy: {
      '/api/algod': {
        target: 'https://testnet-api.algonode.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/algod/, ''),
        secure: true,
        headers: {
          'User-Agent': 'LandTitle-DApp/1.0.0'
        }
      },
      '/api/indexer': {
        target: 'https://testnet-idx.algonode.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/indexer/, ''),
        secure: true,
        headers: {
          'User-Agent': 'LandTitle-DApp/1.0.0'
        }
      }
    }
  }
});