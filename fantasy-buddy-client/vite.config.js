import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 前端开发服务器：/v1 请求代理到后端 (默认 http://localhost:3000)
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 监听 0.0.0.0，允许平板/手机通过局域网 IP 访问
    port: 5173,
    proxy: {
      '/v1': {
        target: process.env.API_TARGET || 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
