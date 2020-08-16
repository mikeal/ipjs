import { promises as fs } from 'fs'
import { rollup } from 'rollup'
import file from './file.js'
import testFile from './testFile.js'
import path from '../path-to-url.js'
import { fileURLToPath } from 'url'
import { join } from 'path'
import rmtree from '@tgrajewski/rmtree'

const copy = o => JSON.parse(JSON.stringify(o))
const vals = Object.values

const { writeFile, mkdir, unlink, readdir, readFile } = fs

class Package {
  constructor ({ cwd, hooks, tests }) {
    this.cwd = cwd
    this.hooks = hooks || {}
    this.parsed = this.parse()
    this.files = new Map()
    this.testFiles = new Map()
    this.includeTests = tests
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
    const json = JSON.parse((await readFile(toURL('package.json'))).toString())
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
          for (const [key, value] of Object.entries(exports)) {
            if (!value.import) throw new Error(`Must specify an "import" target for the "${key}" export`)
          }
        }
      }
    }
    this.exports = exports
    const testFiles = await this.getTestFiles()
    this.tests = new Map(testFiles.map(k => [k, this.testFile(toURL(k))]))
    await Promise.all([...this.files.values(), ...this.testFiles.values()])
    return this
  }

  async testFile (url) {
    const key = url.toString()
    if (!this.testFiles.has(key)) {
      this.testFiles.set(key, testFile(this, url, this.hooks))
    }
    return this.testFiles.get(key)
  }

  exported (ex) {
    const { name } = this.pkgjson
    let key
    if (ex === name) key = '.'
    else key = './' + ex.slice(name.length + '/'.length)
    if (!this.pkgjson.exports[key]) throw new Error(`No export named "${ex}"`)
    return this.pkgjson.exports[key]
  }

  async getTestFiles () {
    const files = await readdir(this.cwd)
    const testFiles = []
    if (files.includes('test.js')) testFiles.push('test.js')
    const parseDir = async dir => {
      const files = await readdir(this.cwd + '/' + dir)
      files.filter(f => f.endsWith('.js')).forEach(f => testFiles.push(dir + '/' + f))
    }
    for (const name of ['test', 'tests']) {
      if (files.includes(name)) {
        await parseDir(name)
      }
    }
    return testFiles
  }

  relative (file) {
    const path = fileURLToPath(file.url)
    if (!path.startsWith(this.cwd)) throw new Error('File is not in source directory')
    const rel = path.slice(this.cwd.length + 1)
    return './' + rel
  }

  async deflateCJS (dist) {
    const files = await Promise.all(vals(this.exports).map(vals).flat())
    // TODO: add tests
    const paths = [...new Set(files.map(f => this.relative(f)))]
    const code = paths.map(p => `import("${p}")`).join('\n')
    const input = new URL(dist + '/esm/_ipjsInput.js')
    await writeFile(input, code)
    const compile = await rollup({ input: fileURLToPath(input), treeshake: false })
    const dir = fileURLToPath(new URL(dist + '/cjs'))
    await compile.write({ preserveModules: true, dir })
    await unlink(input)
  }

  async deflate (dist) {
    if (!(dist instanceof URL)) dist = path(dist)
    rmtree(fileURLToPath(dist))
    await mkdir(dist)
    await mkdir(new URL(dist + '/cjs'))
    await mkdir(new URL(dist + '/esm'))

    const pending = [...this.files.values()].map(p => p.then(f => f.deflate(dist)))
    await Promise.all(pending)
    await this.deflateCJS(dist)

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
}

export default opts => (new Package(opts)).parsed
