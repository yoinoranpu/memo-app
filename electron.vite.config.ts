import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          note: resolve(__dirname, 'src/preload/note.ts'),
          settings: resolve(__dirname, 'src/preload/settings.ts'),
          toast: resolve(__dirname, 'src/preload/toast.ts'),
          consent: resolve(__dirname, 'src/preload/consent.ts')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          settings: resolve(__dirname, 'src/renderer/settings.html'),
          toast: resolve(__dirname, 'src/renderer/toast.html'),
          consent: resolve(__dirname, 'src/renderer/consent.html')
        }
      }
    },
    plugins: [react()]
  }
})
