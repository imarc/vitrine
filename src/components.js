import { readdir } from 'node:fs/promises'
import { basename, dirname, join, sep, resolve } from 'path'

const COMPONENT_PATTERN = /\.(twig|html)$/i

export const findComponents = async dir => {
  console.log({ dir })
  try {
    return await readdir(dir, { withFileTypes: true, recursive: true })
      .then(files => {
        console.log({ files })
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
  } catch (e) { console.error(e) }
}
