import { promises as fs, existsSync } from 'fs'
import { rollup } from 'rollup'
import file from './file.js'
import testFile from './testFile.js'
import path from '../path-to-url.js'
import { fileURLToPath } from 'url'
import { join, dirname, resolve, relative } from 'path'
import rmtree from '@tgrajewski/rmtree'
import preserveShebangs from 'rollup-plugin-preserve-shebangs'

const docFileRegex = /^(readme|license)/i

const copy = o => JSON.parse(JSON.stringify(o))
const vals = Object.values

const { writeFile, mkdir, unlink, readdir, readFile, copyFile } = fs

const plugins = [preserveShebangs.preserveShebangs()]

class Package {
  constructor ({ cwd, hooks, tests, main }) {
    this.cwd = cwd
    this.hooks = hooks || {}
    this.parsed = this.parse()
    this.files = new Map()
    this.testFiles = new Map()
    this.includeTests = tests
    this.includeMain = main
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
      exports['.'] = { import: this.file(toURL(json.main || './index.js')) }
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
    let promises = [...this.files.values()]
    this.docFiles = new Map((await this.getDocFiles()).map(f => [f, toURL(f)]))
    if (this.includeTests) {
      const testFiles = await this.getTestFiles()
      this.tests = new Map(testFiles.map(k => [k, this.testFile(toURL(k))]))
      promises = [...promises, ...this.testFiles.values()]
    }
    await Promise.all(promises)
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
    if (!this.pkgjson.exports) {
      throw new Error('Must define export map')
    }
    if (key === '.') {
      if (this.pkgjson.exports.import) return this.pkgjson.exports
    }
    if (!this.pkgjson.exports[key]) throw new Error(`No export named "${ex}"`)
    return this.pkgjson.exports[key]
  }

  async getDocFiles () {
    return (await readdir(this.cwd)).filter(f => docFileRegex.test(f))
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
    const paths = [...new Set(files.map(f => this.relative(f)))]
    if (this.includeTests) {
      let t = await Promise.all([...this.testFiles.values()])
      t = new Set(t.map(f => this.relative(f)))
      for (const rel of t) {
        paths.push(...['./browser-', './node-'].map(n => n + rel.slice(2)))
      }
    }
    const code = paths.map(p => `import("${p}")`).join('\n')
    const input = new URL(dist + '/esm/_ipjsInput.js')
    await writeFile(input, code)
    const onwarn = warning => {
      const skips = ['PREFER_NAMED_EXPORTS']
      if (skips.includes(warning.code)) {
        // noop
      } else {
        console.log(warning.message)
      }
    }

    const compile = await rollup({ input: fileURLToPath(input), treeshake: false, onwarn, plugins })
    const dir = fileURLToPath(new URL(dist + '/cjs'))
    await compile.write({ preserveModules: true, dir, format: 'cjs' })
    await unlink(input)
    await unlink(new URL(dist + '/cjs/_ipjsInput.js'))
  }

  async stubFiles (dist, overrides) {
    await Promise.all(
      Object.keys(overrides).map(async (file) => {
        const target = overrides[file]

        if (file === '.') {
          file = 'index.js'
        }
        if (file.startsWith('./')) {
          file = file.substring(2)
        }
        const dir = dirname(file)
        if (dir !== '.') {
          try {
            await mkdir(new URL(dist + '/' + dir), {
              recursive: true
            })
          } catch (err) {
            if (err.code !== 'EEXIST') {
              throw err
            }
          }
        }

        if (existsSync(new URL(dist + '/' + file))) {
          return
        }

        const distPath = fileURLToPath(dist)
        const stubUrl = new URL(dist + '/' + file)
        const stubPath = fileURLToPath(stubUrl)
        const targetPath = resolve(join(distPath, target))
        let relativePath = relative(dirname(stubPath), targetPath)

        if (!relativePath.startsWith('./')) {
          relativePath = `./${relativePath}`
        }

        await writeFile(stubUrl, `module.exports = require('${relativePath}')\n`)
      })
    )
  }

  async deflate (dist) {
    if (!(dist instanceof URL)) dist = path(dist)
    rmtree(fileURLToPath(dist))
    await mkdir(new URL(dist + '/cjs'), { recursive: true })
    await mkdir(new URL(dist + '/esm'))

    const pending = [...this.files.values()].map(p => p.then(f => f.deflate(dist)))
    for (const [f, url] of this.docFiles) {
      pending.push(copyFile(url, new URL(`${dist}/${f}`)))
    }
    if (this.includeTests) {
      pending.push(...[...this.testFiles.values()].map(p => p.then(f => f.deflate(dist))))
    }
    await Promise.all(pending)
    await this.deflateCJS(dist)

    const json = copy(this.pkgjson)

    delete json.type
    if (this.includeMain) {
      json.main = `./${join('./cjs', json.main || './index.js')}`
    } else {
      delete json.main
    }
    json.browser = {}
    json.exports = {}
    const _join = (...args) => './' + join(...args)
    const esmBrowser = {}
    for (const [key, ex] of Object.entries(this.exports)) {
      const _import = this.relative(await ex.import)
      const _browser = ex.browser ? this.relative(await ex.browser) : _import
      json.exports[key] = {
        browser: _join('esm', _browser),
        require: _join('cjs', _import),
        import: _join('esm', _import)
      }
      json.browser[key] = _join('cjs', _browser)
      if (_import !== _browser) {
        json.browser[_join('esm', _import)] = _join('esm', _browser)
        json.browser[_join('cjs', _import)] = _join('cjs', _browser)
        esmBrowser[_import] = _browser
      }
    }
    if (json.exports.import) {
      json.exports = json.exports.import
      json.browser = json.browser.import
    }
    await this.stubFiles(dist, json.browser)
    let files = Promise.all(pending)
    pending.push(writeFile(new URL(dist + '/package.json'), JSON.stringify(json, null, 2)))
    const typeModule = {
      type: 'module',
      browser: esmBrowser
    }
    pending.push(writeFile(new URL(dist + '/esm/package.json'), JSON.stringify(typeModule, null, 2)))
    await Promise.all(pending)
    files = await files
    return files
  }
}

export default opts => (new Package(opts)).parsed
