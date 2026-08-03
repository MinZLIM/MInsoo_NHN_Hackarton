import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// GitHub Pages는 https://<user>.github.io/<repo>/ 로 서빙되므로 base에 repo명이 필요하다.
// 로컬 dev는 '/' 여야 하므로 build일 때만 적용한다.
const REPO_NAME = 'MInsoo_NHN_Hackarton'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? `/${REPO_NAME}/` : '/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
}))
