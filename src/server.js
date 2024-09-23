import { basename, dirname, join, sep } from 'path'
import { fileURLToPath } from 'url'
import { readdir, readFile } from 'node:fs/promises'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import RecursiveList from './templates/RecursiveList.js'

const setNested = (obj, val, ...keys) => {
  const key = keys.shift()
  if (key) {
    if (!('children' in obj)) {
      obj.children = []
    }
    let child = obj.children.find(e => e.name === key)

    if (!child) {
      child = { name: key }
      obj.children.push(child)
    }
    setNested(child, val, ...keys)
  } else {
    Object.assign(obj, val)
  }
}

const buildComponentTree = async (dir, filePattern, urlPrefix) => {
  return await readdir(dir, { withFileTypes: true, recursive: true })
    .then(files => {
      const tree = { children: [] }

      files.filter(file => filePattern.test(file.name))
        .forEach(file => {
          const path = file.parentPath.replace(dir + sep, '').split(sep)
          const filenameSegment = file.name.replace(filePattern, '')
          if (path.at(-1) != filenameSegment) {
            path.push(filenameSegment)
          }

          console.log(path)
          
          const node = {
            name: file.name.replace(filePattern, ''),
            url: join(file.parentPath, file.name.replace(filePattern, '')).replace(dir, urlPrefix),
          }

          setNested(tree, node, ...path)
        })

      return tree.children
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
    onMounted() {
      hljs.highlightAll()
    },
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
          const related = files.map(({ name }) => name)
          files = files.filter(({ name }) => componentPattern.test(name))

          let file = files.find(({ name }) => name.startsWith(`${pathbase}.`))
          if (!file) {
            file = files.find(({ name }) => /^index\.[^.]*$/i.test(name))
          }

          if (!file) {
            return resolve(previewTemplate({ components, component: undefined }))
          }

          const params = Object.fromEntries(
            (new URLSearchParams(request.url.replace(/#.*$/, '').replace(/^.*\?(.*)/, '$1'))).entries()
          )

          const component = join(rootPath, file.parentPath, file.name)

          if ('html' in params) {
            const code = await readFile(component, { encoding: 'utf8' })
            return resolve(code + buildIncludeTags(include))

          } else {
            try {
              let filename = related.find(name => name in params)
              if (!filename) {
                filename = file.name
              }

              const code = await readFile(
                join(rootPath, file.parentPath, filename),
                { encoding: 'utf8' }
              )

              return resolve(previewTemplate({
                related,
                filename: filename,
                components,
                code,
                component: join(dir, pathbase) + '?html',
              }))

            } catch (error) {
              console.error(error)
              return reject(error)
            }
          }

        }).catch(reject)
    })
  }
}
