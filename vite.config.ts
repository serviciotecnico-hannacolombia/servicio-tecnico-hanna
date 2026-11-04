import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'reporte-in-situ-preview',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__preview/intervenciones-2025', async (req, res) => {
        if (req.method !== 'GET') {res.statusCode=405;res.end();return}
        try {
          const contenido=await readFile(resolve(server.config.root,'.cache/reporte-in-situ-preview/base-2025.json'),'utf8')
          res.setHeader('Content-Type','application/json; charset=utf-8')
          res.setHeader('Cache-Control','no-store')
          res.end(contenido)
        } catch {res.statusCode=404;res.end()}
      })
    },
  }],
})
