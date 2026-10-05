import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

// 构建时把 package.json 的版本号与构建时间注入产物，便于在设备上确认是否已更新
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

// 前端开发服务器：/v1 请求代理到后端 (默认 http://localhost:3000)，仅服务端模式使用
export default defineConfig({
  // 相对路径产物：兼容 GitHub Pages 等子路径静态托管
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: '奇幻小伙伴',
        short_name: '奇幻小伙伴',
        description: '做任务 · 养宠物 · 一起成长',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFF7F2',
        theme_color: '#FF8A65',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true
      },
      devOptions: { enabled: false }
    })
  ],
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
