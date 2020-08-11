import { promises as fs } from 'fs'
import file from './file.js'
import path from '../path-to-url.js'
import { fileURLToPath } from 'url'
import { join } from 'path'
import rmtree from '@tgrajewski/rmtree'

const copy = o => JSON.parse(JSON.stringify(o))

class Package {
  constructor ({ cwd, hooks }) {
    this.cwd = cwd
    this.hooks = hooks || {}
    this.parsed = this.parse()
    this.files = new Map()
  }

  file (url) {
    const key = url.toString()
    if (!this.files.has(key)) {
      this.files.set(key, file(this, url, this.hooks))
    }
    return this.files.get(key)
  }

  async parse () {
    if (this.parsed) throw new Error('Already parsed/parsing')
    const toURL = s => path(s, this.cwd)
    const pkgjson = await fs.open(toURL('package.json'))
    const json = JSON.parse((await pkgjson.readFile()).toString())
    this.pkgjson = json

    if (json.type !== 'module') throw new Error('Unsupported: package.json must have "type: module"')

    if (json.imports) {
      this.importMap = new Map()
      for (const [key, value] of Object.entries(json.imports)) {
        this.importMap.set(key, this.file(toURL(value)))
      }
    }
    this.namedImports = new Set()

    const exports = {}
    if (!json.exports) {
      if (!json.main) exports['.'] = { import: this.file(toURL('./index.js')) }
      exports['.'] = { import: this.file(toURL(json.main)) }
    } else {
      for (const [key, value] of Object.entries(json.exports)) {
        if (typeof value === 'string') exports[key] = { import: this.file(toURL(value)) }
        else {
          exports[key] = {}
          for (const [ex, str] of Object.entries(value)) {
            if (ex === 'require') {
              throw new Error('IPJS builds require exports, cannot accept a require export as input')
            }
            exports[key][ex] = this.file(toURL(str))
          }
        }
      }
    }
    this.exports = exports
    await Promise.all([...this.files.values()])
    return this
  }

  relative (file) {
    const path = fileURLToPath(file.url)
    if (!path.startsWith(this.cwd)) throw new Error('File is not in source directory')
    const rel = path.slice(this.cwd.length + 1)
    return './' + rel
  }

  async deflate (dist) {
    rmtree(dist)
    dist = path(dist)
    const { mkdir, writeFile } = fs
    await mkdir(dist)
    await mkdir(new URL(dist + '/cjs'))
    await mkdir(new URL(dist + '/esm'))

    const pending = [...this.files.values()].map(p => p.then(f => f.deflate(dist)))

    const json = copy(this.pkgjson)

    delete json.type
    delete json.main
    json.browser = {}
    json.exports = {}
    for (const [key, ex] of Object.entries(this.exports)) {
      const _import = this.relative(await ex.import)
      const _browser = ex.browser ? this.relative(await ex.browser) : _import
      json.exports[key] = {
        require: join('cjs', _import),
        import: join('esm', _import),
        browser: join('esm', _browser)
      }
      json.browser[key] = join('cjs', _browser)
    }
    let files = Promise.all(pending)
    pending.push(writeFile(new URL(dist + '/package.json'), JSON.stringify(json, null, 2)))
    const typeModule = '{ "type" : "module" }'
    pending.push(writeFile(new URL(dist + '/esm/package.json'), typeModule))
    files = await files
    return files
  }
  async close () {
    const files = await Promise.all([...this.files.values()])
    files.forEach(f => f.worker.worker.unref())
  }
}

export default opts => (new Package(opts)).parsed
