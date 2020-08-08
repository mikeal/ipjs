import { promises as fs } from 'fs'
import file from './file.js'
import path from '../path-to-url.js'

const vals = Object.values

class Package {
  constructor ({cwd}) {
    this.cwd = cwd
    this.parsed = this.parse()
  }
  file (url) {
    const key = url.toString()
    if (!this.files.has(key)) {
      this.files.set(key, file(this, url))
    }
    return this.files.get(key)
  }
  async parse () {
    if (this.parsed) throw new Error('Already parsed/parsing')
    const toURL = s => path(s, this.cwd)
    const pkgjson = await fs.open(toURL('package.json'))
    const json = JSON.parse((await pkgjson.readFile()).toString())

    if (json.type !== 'module') throw new Error('Unsupported: package.json must have "type: module"')

    if (json.imports) {
      this.importMap = new Map()
      for (const [key, value] of Object.entries(json.imports)) {
        this.importMap.set(key, this.file(toURL(value)))
      }
    }
    this.namedImports = new Set()
    this.files = new Map()

    const exports = {}
    if (!json.exports) {
      if (!json.main) exports['.'] = { import: this.file(toURL('./index.js')) }
      exports['.'] = { import: this.file(toURL(json.main)) }
    } else {
      for (const [ key, value ] of Object.entries(json.exports)) {
        if (typeof value === 'string') exports[key] = { import: this.file(toURL(value)) }
        else {
          exports[key] = {}
          for (const [ ex, str ] of Object.entries(value)) {
            if (ex === 'require') {
              throw new Error('IPJS builds require exports, cannot accept a require export as input')
            }
            exports[key][ex] = this.file(toURL(str))
          }
        }
      }
    }
    await Promise.all([...this.files.values()])
  }
}

export default async opts => {
  const pkg = new Package(opts)
  await pkg.parsed
  return pkg
}
