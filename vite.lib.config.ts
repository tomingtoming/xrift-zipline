import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

/**
 * ライブラリビルド（npmパッケージ `xrift-zipline` 本体）。
 * 依存は全て external＝実行時は消費側アプリの react/three/@react-three/fiber/
 * @xrift/world-components に乗る。
 */
export default defineConfig({
  publicDir: false,
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src'],
      outDir: 'lib',
    }),
  ],
  build: {
    outDir: 'lib',
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^three($|\/)/, /^@react-three\//, /^@xrift\//],
    },
  },
})
