export default class TreeNode {
  constructor(key) {
    this.key = key
    this.children = {}
  }

  toArray() {
    return Object.values(this.children)
  }
  
  toFlatArray() {
    return [this, ...this.toArray().flatMap(child => child.toFlatArray())]
  }

  set(keys, value) {
    if (keys?.length === 0) {
      Object.assign(this, value)
      return this
    }

    keys = [].concat(keys)
    const key = keys.shift()
    if (!(key in this.children)) {
      this.children[key] = new TreeNode(key)
    }

    return this.children[key].set(keys, value)
  }

  get(keys) {
    keys = [].concat(keys).flat()
    if (keys.length === 0) {
      return this
    }

    const key = keys.shift()
    if (key in this.children) {
      return this.children[key].get(keys)
    }

    return undefined
  }
}
