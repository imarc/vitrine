import process from 'node:process'
import semver from 'semver'
import Server from './src/server.js'

export default function vitrinePlugin({
  includes = [],
  prefix = '/components',
  template = '_preview.html',
  basePaths = ['resources/styles'],
  componentPattern = /^[^_].*\.md|\.html?$/i,
  stylesheetPattern = /\.(css|less|sass|scss|styl)$/i
} = {}) {

  const server = new Server({ prefix, basePaths, componentPattern, template, stylesheetPattern })
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
            .then(body => {
              res.setHeader('Content-Type', 'text/html')
              res.end(body, 'utf8')
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
