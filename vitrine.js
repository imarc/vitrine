import { readdir } from 'node:fs/promises'
import { basename, dirname, join, sep } from 'path'
import { renderTemplate } from './src/templating.js'

const COMPONENT_PATTERN = /\.(twig|html)$/i

export default function vitrinePlugin(prefix = '/vitrine', base = 'resources') {

  const toPath = url => String(url).replace(/[?#].*$/, '').replace(prefix, base)
  const toUrl = path => path.replace(base, prefix)

  const componentTree = async dir => {
    return await readdir(dir, { withFileTypes: true, recursive: true })
      .then(files => {
        const tree = {}

        files.filter(file => COMPONENT_PATTERN.test(file.name))
          .forEach(file => {
            const path = file.parentPath.split(sep).concat(file.name)
            path.reduce((tree, seg, i) =>
              tree[seg]
                ?? (tree[seg] = i < path.length - 1
                  ? {}
                  : {
                    name: file.name.replace(COMPONENT_PATTERN, ''),
                    url: toUrl(join(file.parentPath, file.name)),
                  }), tree)
          })

        return tree
      })
  }

  const showIndex = async dir => {
    return await readdir(dir, { withFileTypes: true, recursive: true })
      .then(async files => {
        const links = files
          .filter(file => COMPONENT_PATTERN.test(file.name) || file.isDirectory())
          .map(file => ({
          file,
          name: file.name.replace(COMPONENT_PATTERN, ''),
          isDirectory: file.isDirectory(),
          url: toUrl(join(dir, file.name)),
        }))

        const tree = await componentTree(dir)

        return await renderTemplate('main.twig', { tree, links })
      })
  }

  const showComponent = (component, data = {}) => renderTemplate('main.twig', { component, ...data })

  const handle = request => {
    const path = toPath(request.url)
    return new Promise( (resolve, reject) => {
      const dir = dirname(path)
      const base = basename(path)
      return readdir(dir, { withFileTypes: true })
        .then(files => {
          if (base === '.') {
            return resolve(showIndex(base))
          }

          const file = files.find(file => file.name.startsWith(base))

          if (!file) {
            return reject(new Error('Not found'))
          }

          if (file.isDirectory()) {
            return resolve(showIndex(join(dir, file.name)))
          } else if (COMPONENT_PATTERN.test(file.name)) {
            const params = Object.fromEntries(
              (new URLSearchParams(request.url.replace(/#.*$/, '').replace(/^.*\?(.*)/, '$1'))).entries()
            )
            return resolve(showComponent(join(dir, file.name), { params }))
          }
          reject()
        })
        .catch(reject)
    })
  }

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

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith(prefix)) {
          handle(req)
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
      if (file.endsWith('.twig') || file.endsWith('.html')) {
        server.ws.send({ type: 'full-reload' })
      }
    }
  }
}
