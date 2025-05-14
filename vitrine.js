import process from 'node:process'
import semver from 'semver'
import Server from './src/server.js'
import { writeFile, mkdir, copyFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'

export default function vitrinePlugin({
  includes = [],
  includeVite = true,
  prefix = '/components',
  template = '_preview.html',
  basePaths = ['resources/styles'],
  componentPattern = /\.md|\.html?$/i,
  stylesheetPattern = /\.(css|less|sass|scss|styl)$/i,
  outDir = 'dist',
  manifestDir = undefined,
  buildLibrary = true,
  name = 'Vitrine',
  logo = undefined,
  version = undefined,
} = {}) {

  const server = new Server({ prefix, basePaths, componentPattern, template, stylesheetPattern, name, logo, version })

  if (includeVite) {
    server.include('/@vite/client')
  }

  server.include(includes)

  return {
    name: 'vitrine',
    version: '0.1.0',

    configureServer(vite) {
      if (semver.lt(process.versions.node, '20.0.0')) {
        console.error("Vitrine requires node version 20 or newer.")
        process.exit(1)
      }

      console.log(`  Vitrine 0.1.0`)

      vite.middlewares.use((req, res, next) => {
        if (req.url.startsWith(prefix)) {
          server.handle(req)
            .then(response => {
              if (response?.redirect) {
                res.writeHead(302, { Location: response.redirect })
                res.end()
                return
              }
              res.setHeader('Content-Type', 'text/html')
              res.end(response, 'utf8')
            })
            .catch(() => {
              res.writeHead(404)
              res.end()
            })
        } else {
          next()
        }
      })
    },

    async closeBundle() {
      if (!buildLibrary) {
        return
      }

      // Get the manifest of built assets
      if (manifestDir === undefined) {
        manifestDir = join(outDir, '.vite')
      }
      if (manifestDir) {
        server.useManifest(join(manifestDir, 'manifest.json'))
      }
      server.setIsServer(false)

      console.log('Building static component library...')
      const components = await server.findComponents()
      
      const writeStaticFile = async (filePath, content) => {
        const fullPath = join(outDir, filePath)
        await mkdir(dirname(fullPath), { recursive: true })
        await writeFile(fullPath, content)
      }
      
      // Generate the main index
      const indexHtml = await server.view({ components, server: { prefix, basePaths } })
      await writeStaticFile(join(prefix.slice(1), 'index.html'), indexHtml)

      // Generate pages for each component
      for (const component of components.toFlatArray()) {
        if (component.url) {
          // Main component view
          const req = { url: component.url }
          const html = await server.handle(req)
          const outputPath = join(prefix.slice(1), component.url.slice(prefix.length + 1), 'index.html')
          await writeStaticFile(outputPath, html)

          if (component.type === 'component' || component.type === 'directory') {
            // HTML preview version
            const previewHtml = await server.handle({ url: `${component.url}/@html` })
            const previewPath = join(prefix.slice(1), component.url.slice(prefix.length + 1), '@html/index.html')
            await writeStaticFile(previewPath, previewHtml)
          }
        }
      }
    },

    handleHotUpdate({ file, modules, server }) {
      console.log('handleHotUpdate', file, modules)
      if (componentPattern.test(file)) {
        server.ws.send({ type: 'full-reload' })
        return []
      }
      return modules
    }
  }
}
