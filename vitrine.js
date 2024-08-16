import { join } from 'path'
import Server from './src/server.js'

export default function vitrinePlugin({
  include = [],
  prefix = '/vitrine',
  base = 'resources/styles',
  componentPattern = /\.html?$/i,
} = {}) {
  const vitrine = new Server(prefix, base, componentPattern)
  vitrine.setInclude(include)

  return {
    name: 'vitrine',
    version: '0.0.1',

    generateBundle(_, bundle) {
      const vitrineDir = 'vitrine'
      const source = 'Hello World'

      bundle[join('vitrine', 'index.html')] = {
        fileName: join(vitrineDir, 'index.html'),
        name: 'index.html',
        type: 'asset',
        source,
      }
    },

    configResolved(config) {
      vitrine.setPath(config.root)
    },

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith(prefix)) {
          vitrine.handle(req)
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

    handleHotUpdate({ file, server }) {
      if (componentPattern.test(file)) {
        server.ws.send({ type: 'full-reload' })
      }
    }
  }
}
