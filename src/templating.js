import { existsSync } from 'node:fs'
import process from 'node:process'
import { join } from 'path'
import Twig from 'twig'

Twig.cache(false)

const searchPaths = ['.', 'templates', 'node_modules/vitrine/templates'].map(dir => join(process.cwd(), dir))

const findTemplate = tmpl => {
  for (const dir of searchPaths) {
    const filepath = join(dir, tmpl)
    if (existsSync(filepath)) {
      return filepath
    }
  }
  throw new Error(`Template '${tmpl}' not found`)
}

export const renderComponent = (data) => {
  const filepath = findTemplate('vitrine.twig')

  return new Promise((resolve, reject) => {
    Twig.renderFile(filepath, data, (err, html) => {
      if (err) {
        reject(err)
      } else {
        resolve(html)
      }
    })
  })
}
