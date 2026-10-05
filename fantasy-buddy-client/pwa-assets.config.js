import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// 生成 PWA 图标：npx pwa-assets-generator（或 npm run gen:icons）
// 产物输出到 public/：pwa-64x64 / pwa-192x192 / pwa-512x512 / maskable-icon-512x512 / apple-touch-icon-180x180 / favicon.ico
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.svg']
});
