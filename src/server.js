import { fileURLToPath } from 'node:url'
import { join, sep } from 'node:path'
import { existsSync } from 'node:fs'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { readdir, readFile } from 'node:fs/promises'
import TreeNode from './TreeNode.js'
import RecursiveList from './templates/RecursiveList.js'

const defaultTemplate = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>\${component.name}</title>
    <!-- Using Vitrine's builtin template -->
  </head>
  <body>
    <div id="app">
      \${code}
    </div>
    \${includes}
  </body>
  </html>
`

export default class Server {
  #basePaths;
  #componentPattern;
  #includes = [];
  #prefix;
  #template;

  constructor({
    prefix,
    basePaths,
    componentPattern,
    template,
  } = {}) {
    this.#prefix = prefix
    this.#componentPattern = componentPattern
    this.#template = template

    this.#basePaths = basePaths.map(path => {
      path = this.parseBasePath(path)
      if (!existsSync(path.dir)) {
        console.warn(`Vitrine could not find basePath directory ${path.dir}.`)
      }
      return path
    })
  }

  include(...files) {
    this.#includes = [].concat(...files)
  }

  parseURLParams(request) {
    const queryStr = request.url.replace(/#.*$/, '').replace(/^.*\?(.*)/, '$1')
    return Object.fromEntries((new URLSearchParams(queryStr)).entries())
  }

  parseBasePath(dir) {
    if (typeof dir === 'string') {
      if (/node_modules/.test(dir)) {
        return { dir, name: dir.replace(/^\/?node_modules\/([^/]*).*/, '$1') }
      }

      return { dir }
    }

    return dir
  }

  getIncludeTags() {
    return this.#includes
      .map(include => /\.[jt]s$/i.test(include)
        ? `<script type="module" src="${include}"></script>`
        : `<link rel="stylesheet" href="${include}">`
      )
      .join('\n')
  }

  async view(params = {}) {
    try {
      let filename = import.meta.resolve('./templates/vitrine.html')
      filename = fileURLToPath(filename)
      const template = await readFile(filename, { encoding: 'utf8' })

      const app = createSSRApp({
        components: {
          RecursiveList,
        },
        data: () => params,
        template
      })
      return await renderToString(app)
    } catch (e) {
      console.error(e)
      return '500 Internal Server Error: ' + e.message
    }
  }

  async findComponents(basePaths) {
    const tree = new TreeNode

    for (const basePath of basePaths) {
      const files = await readdir(basePath.dir, { withFileTypes: true, recursive: true })

      files
        .filter(file => this.#componentPattern.test(file.name))
        .forEach(file => {
          const path = file.parentPath.replace(basePath.dir + sep, '')
          const name = file.name.replace(this.#componentPattern, '')
          const segments = path.split(sep)

          if (join(file.parentPath, file.name) === join(basePath.dir, this.#template)) {
            return
          }

          if (basePath.name) {
            segments.unshift(basePath.name)
          }

          if (segments.at(-1) !== name) {
            segments.push(name)
          }

          const node = {
            name,
            parentPath: file.parentPath,
            filename: join(file.parentPath, file.name),
            url: join(this.#prefix, ...segments)
          }

          tree.set(segments, node)
        })
    }

    return tree
  }

  interpolate(str, params) {
    const names = Object.keys(params)
    const values = Object.values(params)

    return new Function(...names, `return \`${str}\`;`)(...values)
  }

  async render(template, params) {
    for (const basePath of this.#basePaths) {
      if (existsSync(join(basePath.dir, template))) {
        const tmpl = await readFile(join(basePath.dir, template), { encoding: 'utf8' })
        return this.interpolate( tmpl, {
          ...params,
          template: join(basePath.dir, template),
        })
      }
    }
    return this.interpolate(defaultTemplate, params)
  }

  async findRelatedFiles(component) {
    const files = await readdir(component.parentPath, { withFileTypes: true })

    return files.filter(file => file.isFile())
      .map(file => {
      const url = component.filename === join(file.parentPath, file.name)
        ? component.url
        : component.url + `?file=${file.name}`
      return {
        name: file.name,
        parentPath: file.parentPath,
        filename: join(file.parentPath, file.name),
        debug: this.#prefix,
        component,
        url,
      }
    })
  }

  async handle(request) {
    try {
      const components = await this.findComponents(this.#basePaths)
      const segments = request.url
        .replace(this.#prefix, '')
        .replace(/[#?].*$/, '')
        .split('/')
        .filter(c => c)
      const component = components.get(segments)
      const related = component?.parentPath ? await this.findRelatedFiles(component) : null
      const urlParams = this.parseURLParams(request)

      const data = {
        server: {
          prefix: this.#prefix,
          basePaths: this.#basePaths
        },
        components,
        component,
        related,
      }

      if (component && 'file' in urlParams) {
        data.viewingFile = urlParams.file
        data.code = await readFile(join(component.parentPath, urlParams.file), { encoding: 'utf8' })

      } else if (component?.filename) {
        data.viewingFile = component.filename.replace(/^.*\//, '')
        data.code = await readFile(component.filename, { encoding: 'utf8' })
      }

      if ('html' in urlParams) {
        return this.render(this.#template, {
          component,
          code: data.code,
          includes: this.getIncludeTags(),
        })
      }

      return await this.view(data)

    } catch (e) {
      console.error(e)
      throw e
    }
  }
}
