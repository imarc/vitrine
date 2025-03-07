import he from 'he'
import { fileURLToPath } from 'node:url'
import { join, sep } from 'node:path'
import { existsSync } from 'node:fs'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { readdir, readFile } from 'node:fs/promises'
import { marked } from 'marked'
import { fdir } from 'fdir'

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
  #stylesheetPattern;
  #includes = [];
  #prefix;
  #template;
  #isServer;
  #manifest;
  constructor({
    prefix,
    basePaths,
    componentPattern,
    stylesheetPattern,
    template,
    isServer = true,
  } = {}) {
    this.#prefix = prefix
    this.#componentPattern = componentPattern
    this.#stylesheetPattern = stylesheetPattern
    this.#template = template
    this.#isServer = isServer

    this.#basePaths = basePaths.map(path => {
      path = this.parseBasePath(path)
      if (!existsSync(path.dir)) {
        console.warn(`Vitrine could not find basePath directory ${path.dir}.`)
      }
      return path
    })
  }
  
  async useManifest(manifest) {
    this.#manifest = JSON.parse(await readFile(manifest, 'utf-8'))
  }
  
  setIsServer(isServer) {
    this.#isServer = isServer
    if (!this.#isServer) {
      this.#includes = this.#includes.filter(include => include !== '/@vite/client')
    }
  }

  include(...files) {
    this.#includes = this.#includes.concat(...files)
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
    let includes = this.#includes
    if (this.#manifest) {
      includes = includes.map(i => i.replace(/^\//, '')).map(include => {
        if (include in this.#manifest) {
          return '/' + this.#manifest[include].file
        }
        return include
      })
    }
    return includes
      .map(include => {
        if (include.startsWith('<')) {
          return include
        }
        if (this.#stylesheetPattern.test(include)) {
          return `<link rel="stylesheet" href="${include}">`
        }
        return `<script type="module" src="${include}"></script>`
      }).join('\n')
  }

  async view(params = {}) {
    try {
      let filename = import.meta.resolve('./templates/default.html')
      filename = fileURLToPath(filename)
      const template = await readFile(filename, { encoding: 'utf8' })

      const app = createSSRApp({
        components: {
          RecursiveList,
        },
        data: () => ({ ...params, isServer: this.#isServer }),
        methods: {
          markdown: str => marked.parse(str),
          encode: str => he.encode(str),
        },
        template
      })
      const html = await renderToString(app)
      return he.decode(html)
    } catch (e) {
      console.error(e)
      return '500 Internal Server Error: ' + e.message
    }
  }

  async findComponents() {
    const tree = new TreeNode

    for (const basePath of this.#basePaths) {
      if (!existsSync(basePath.dir)) {
        console.warn(`Vitrine was not able to access ${basePath.dir}`)
        continue
      }
      const files = await readdir(basePath.dir, { withFileTypes: true, recursive: true })

      files
        .filter(file => this.#componentPattern.test(file.name))
        .forEach(file => {
          const path = file.parentPath.replace(basePath.dir + sep, '')
          let name = file.name.replace(this.#componentPattern, '')
          const segments = path === basePath.dir ? [] : path.split(sep)
          
          if (join(file.parentPath, file.name) === join(basePath.dir, this.#template)) {
            return
          }

          if (basePath.name) {
            segments.unshift(basePath.name)
          }

          if (name.toLowerCase() === 'index') {
            name = segments.at(-1)
          } else if (segments.at(-1) !== name) {
            segments.push(name)
          }

          const node = {
            name,
            type: 'component',
            parentPath: file.parentPath,
            filename: join(file.parentPath, file.name),
            filetype: file.name.replace(/^.*\./, ''),
            url: join(this.#prefix, ...segments)
          }

          tree.set(segments, node)
        })
    }

    // Second pass - traverse tree to handle directories
    const processNode = (node, parentSegments = []) => {
      // If node has children but no URL, it's a directory that needs a URL
      if (node.toArray().length && !node.url) {
        const segments = [...parentSegments]
        if (node.key) segments.push(node.key)
        
        node.type = 'directory'
        node.name = node.key || 'root'
        node.url = join(this.#prefix, ...segments)
      }

      // Process all children
      for (const child of node.toArray()) {
        const childSegments = [...parentSegments]
        if (node.key) childSegments.push(node.key)
        processNode(child, childSegments)
      }
    }

    processNode(tree)
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

  async renderDirectory(template, params) {
    const code = params.children
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .map(child =>
    `<div style="margin-bottom: 3rem">
      <h4><a href="${child.url}">${child.name}</a></h4>
      <div>${child.code}</div>
    </div>`).join('\n')
    return await this.render(template, {
      ...params,
      code
    })
  }

  async findRelatedFiles(component) {
    const files = await readdir(component.parentPath, { withFileTypes: true })
    
    const seeAlso = []
    const related = await Promise.all(files.filter(file => file.isFile())
      .map(async file => {
        const url = component.filename === join(file.parentPath, file.name)
          ? component.url
          : `${component.url}/@file/${file.name}`
          
        const code = await readFile(join(component.parentPath, file.name), { encoding: 'utf8' })
        const uses = code.match(/(?<=@uses.* )(\w+)/gi) || []
        
        const tags = code.matchAll(/<(\w+-\w+)[ >]/gi).map(m => m[1]) || []
        
        const references = new Set(
          [...uses, ...tags].map(r => r.replace(/(-.)/, v => v[1].toUpperCase()))
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        )
        
        if (references.size) {
          seeAlso.push(...references)
        }
        
        return {
          name: file.name,
          filename: join(file.parentPath, file.name),
          slug: file.name.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-'),
          url,
        }
      })
    )
    
    seeAlso.forEach(name => {
      const searchStuff = `**/${name}.@(js|vue)`
      const crawler = new fdir().glob(searchStuff).withRelativePaths()
      
      let filename = null
      for (const { dir } of this.#basePaths) {
        const results = crawler.crawl(dir).sync()
        if (results.length) {
          filename = join(dir, results[0])
          break
        }
      }

      if (!related.find(r => r.filename === filename)) {
        related.push({
          name,
          filename,
          url: filename ? `${component.url}/@see/${name}` : null,
          slug: name.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-'),
        })
      }
    })


    await Promise.all(related.map(
      async r => r.code = await readFile(r.filename, { encoding: 'utf8' })
    ))

    return related
  }

  async handle(request) {
    try {
      const components = await this.findComponents()
      const segments = request.url
        .replace(this.#prefix, '')
        .replace(/\/@(html|file|see).*/, '')
        .replace(/#.*$/, '')
        .split('/')
        .filter(c => c)
        .map(decodeURIComponent)
      
      const component = components.get(segments)
      const related = component?.parentPath ? await this.findRelatedFiles(component) : null
      
      const data = {
        server: {
          url: request.url,
          prefix: this.#prefix,
          basePaths: this.#basePaths
        },
        components,
        component,
        related,
      }

      if (component && component.type === 'directory') {
        data.children = await Promise.all(component.toArray()
          .filter(c => c.type === 'component' && c.filetype !== 'md')
          .map(async c => {
            c.code = await readFile(c.filename, { encoding: 'utf8' })
            return c
          })
        )
        data.includes = this.getIncludeTags()

        if (request.url.match(/\/@html/)) {
          return this.renderDirectory(this.#template, data)
        }

      } else if (component) {
        data.viewingFile = component.filename?.replace(/^.*\//, '')
        data.code = await readFile(component.filename, { encoding: 'utf8' })
        data.includes = this.getIncludeTags()
      }

      if (request.url.match(/\/@html/)) {
        return this.render(this.#template, {
          component,
          code: data?.code,
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

