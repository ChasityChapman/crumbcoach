// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// ESM-safe __dirname
const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(async ({ mode }) => {
  const isDev = mode !== 'production'
  const isReplit = isDev && process.env.REPL_ID !== undefined

  const plugins = [react()]

  if (isReplit) {
    const { default: runtimeErrorOverlay } = await import('@replit/vite-plugin-runtime-error-modal')
    const { cartographer } = await import('@replit/vite-plugin-cartographer')
    plugins.push(runtimeErrorOverlay(), cartographer())
  }

  return {
    plugins,
    // Capacitor loads from a custom scheme/file:// — empty base prevents broken asset URLs
    base: '',
    root: resolve(__dirname, 'client'),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'client', 'src'),
        '@shared': resolve(__dirname, 'shared'),
        '@assets': resolve(__dirname, 'attached_assets'),
      },
    },
    build: {
      // Match your existing structure; be sure capacitor.config.*.ts "webDir" matches this
      outDir: resolve(__dirname, 'dist/public'),
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
    },
    server: {
      fs: {
        strict: true,
        deny: ['**/.*'],
      },
      port: 5173,
      strictPort: true,
    },
    preview: {
      port: 5174,
      strictPort: true,
    },
  }
})

