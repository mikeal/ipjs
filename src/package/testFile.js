import { parse } from 'acorn'
import astring from 'escodegen'
import { promises as fs } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import file from './file.js'
import dynamicImports from './dynamicImports.js'

const { File, writeFile } = file

const { readFile } = fs
const { generate } = astring

const stropts = { format: { indent: { style: '  ' } } }

class TestFile extends File {
  async parse () {
    if (this.parsed) throw new Error(`Already parsed this file ${this.url}`)
    this.onParse(this)

    const data = await readFile(this.url)
    const program = parse(data, { sourceType: 'module', ecmaVersion: 2020 })

    const imports = []

    const esmNode = { ...program, body: [] }
    const esmBrowser = { ...program, body: [] }

    const { name } = this.pkg.pkgjson
    const push = node => {
      esmNode.body.push(node)
      esmBrowser.body.push(node)
    }

    for (let i = 0; i < program.body.length; i++) {
      const node = program.body[i]
      if (node.type === 'ImportDeclaration') {
        const { source } = node
        const { value } = source
        if (value === name || value.startsWith(name + '/')) {
          const exported = this.pkg.exported(value)
          const rel = p => {
            const u = pathToFileURL(this.pkg.cwd)
            const r = this.url.toString().slice(u.toString().length + 1)
            let pre = (r.match(/\//g) || []).map(() => '../').join('')
            if (!pre.length) pre = './'
            return pre + p.slice(2)
          }
          const rewrite = val => {
            const n = { ...node, source: { ...source } }
            n.source.value = val
            n.source.raw = `"${val}"`
            return n
          }
          rel(exported.import)
          if (exported.browser) {
            esmBrowser.body.push(rewrite(rel(exported.browser)))
          } else {
            esmBrowser.body.push(rewrite(rel(exported.import)))
          }
          esmNode.body.push(rewrite(rel(exported.import)))
        } else {
          push(node)
        }
        imports.push(node.source.value)
      } else {
        push(node)
      }
    }
    dynamicImports(program).forEach(name => imports.push(name))

    this.esmNode = generate(esmNode, stropts)
    this.esmBrowser = generate(esmBrowser, stropts)

    this.imports = new Map()
    for (const value of imports) {
      if (value.startsWith('.')) {
        const url = new URL(value, this.url)
        if (this.testDir && url.toString().startsWith(this.testDir)) {
          this.imports.set(value, this.pkg.testFile(url))
        } else {
          this.imports.set(value, this.pkg.file(url))
        }
      } else {
        this.imports.set(value, null)
      }
    }

    await Promise.all([...this.imports.values()].filter(x => x))
    this.onParsed(this)
    return this
  }

  get testDir () {
    const cwd = pathToFileURL(this.pkg.cwd)
    let testDir = this.url.toString().slice(cwd.toString().length + '/'.length)
    if (!testDir.includes('/')) testDir = null
    else {
      const _dir = './' + testDir.slice(0, testDir.indexOf('/'))
      testDir = (new URL(_dir, cwd.toString() + '/text.txt')).toString()
    }
    return testDir
  }

  async deflate (dist) {
    const { cwd } = this.pkg
    const path = fileURLToPath(this.url)
    if (!path.startsWith(cwd)) throw new Error('File is not in source directory')
    const rel = path.slice(cwd.length + 1)
    await writeFile(new URL(dist + '/esm/browser-' + rel), this.esmBrowser)
    await writeFile(new URL(dist + '/esm/node-' + rel), this.esmNode)
  }
}

export default async (pkg, url, hooks) => {
  const file = new TestFile(pkg, url, hooks)
  await file.parsed
  return file
}
