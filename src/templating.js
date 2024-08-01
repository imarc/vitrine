import { existsSync } from 'node:fs'
import process from 'node:process'
import { join } from 'path'
import Twig from 'twig'

Twig.cache(false)

const searchPaths = ['templates', 'node_modules/vitrine/templates'].map(dir => join(process.cwd(), dir))

const findTemplate = async (tmpl) => {
  for (const dir of searchPaths) {
    const filepath = join(dir, tmpl)
    console.log('checking', dir, filepath)
    if (existsSync(filepath)) {
      console.log('found it here:', filepath)
      return filepath
    } else {
      console.log('nope')
    }
  }
  console.log('no dice')
  throw new Error(`Template '${tmpl}' not found`)
}

export const renderTemplate = async (tmpl, data) => {
  console.log('remplate')
  const filepath = await findTemplate(tmpl)
  console.log('rendering', filepath)
  if (!filepath) {
    throw new Error(`Template '${tmpl}' not found`)
  }
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
