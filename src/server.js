import { basename, dirname, join, sep } from 'path'
import { fileURLToPath } from 'url'
import { readdir, readFile } from 'node:fs/promises'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import RecursiveList from './templates/RecursiveList.js'

const buildComponentTree = async (dir, filePattern, urlPrefix) => {
  return await readdir(dir, { withFileTypes: true, recursive: true })
    .then(files => {
      const tree = {}

      files.filter(file => filePattern.test(file.name))
        .forEach(file => {
          const path = file.parentPath.replace(dir + sep, '').split(sep).concat(file.name.replace(filePattern, ''))
          path.reduce((tree, seg, i) =>
            tree[seg]
              ?? (tree[seg] = i < path.length - 1
                ? {}
                : {
                  name: file.name.replace(filePattern, ''),
                  url: join(file.parentPath, file.name.replace(filePattern, '')).replace(dir, urlPrefix),
                }), tree)
        })

      return tree
    })
}

const previewTemplate = async params => {
  const previewFile = fileURLToPath(import.meta.resolve('./templates/vitrine.html'))
  const template = (await readFile(previewFile, { encoding: 'utf8' }))
  const app = createSSRApp({
    components: {
      RecursiveList,
    },
    data: () => params,
    template
  })
  return await renderToString(app)
}

const buildIncludeTags = includes => includes
  .map(include => /\.css$/i.test(include)
    ? `<link rel="stylesheet" href="${include}">`
    : `<script type="module" src="${include}"></script>`
  ).join('\n')

export default function Server(
  prefix,
  base,
  componentPattern
) {

  const toPath = url => url.replace(prefix, base)

  let rootPath = '.'
  this.setPath = path => rootPath = path

  let include = []
  this.setInclude = inc => include = inc

  this.handle = async function (request) {

    const componentsDir = join(rootPath, base)
    const components = await buildComponentTree(componentsDir, componentPattern, prefix)

    return new Promise((resolve, reject) => {
      const dir = dirname(request.url)
      const path = toPath(dir)
      const pathbase = basename(request.url).replace(/\?.*/, '')
      return readdir(path, { withFileTypes: true })
        .then(async files => {
          files = files.filter(({ name }) => componentPattern.test(name))

          let file = files.find(({ name }) => name.startsWith(`${pathbase}.`))
          if (!file) {
            file = files.find(({ name }) => /^index\.[^.]*$/i.test(name))
          }

          if (!file) {
            return resolve(previewTemplate({ components }))
          }

          const params = Object.fromEntries(
            (new URLSearchParams(request.url.replace(/#.*$/, '').replace(/^.*\?(.*)/, '$1'))).entries()
          )

          const component = join(rootPath, file.parentPath, file.name)
          const code = await readFile(component, { encoding: 'utf8' })

          if ('html' in params) {
            return resolve(code + buildIncludeTags(include))
          } else {
            return resolve(previewTemplate({
              components,
              code,
              component: join(dir, pathbase) + '?html',
            }))
          }

        }).catch(reject)
    })
  }
}
