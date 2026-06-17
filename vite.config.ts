import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // This app runs the Vite dev server in production on Databricks (see app.yaml),
  // so dependency pre-bundling happens at runtime. HMR is disabled in production,
  // which means Vite's normal "outdated optimized dep -> full reload" recovery
  // never fires. If a dependency is discovered lazily (first used after the
  // initial optimize pass), the client can end up with mismatched chunk hashes
  // and crash with errors like "Cannot read properties of null (reading
  // 'useState')". Listing the React runtime and Radix primitives here forces a
  // single, complete, deterministic optimize pass at startup. Add any new
  // dependency that triggers this class of error to the list below.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      '@radix-ui/react-tooltip',
    ],
  },

  server: {
    host: '0.0.0.0',
    port: 8000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
    hmr: process.env.NODE_ENV === 'production' || process.env.DATABRICKS_APP ? false : undefined,
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
