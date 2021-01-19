import { parse } from 'acorn'
import astring from 'escodegen'
import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import dynamicImports from './dynamicImports.js'

const { writeFile, readFile, mkdir } = fs
const { generate } = astring
const stropts = { format: { indent: { style: '  ' } } }

const noop = () => {}

const noops = {
  onParse: noop,
  onParsed: noop
}

const _writeFile = async (url, data) => {
  const str = url.toString()
  const dir = str.slice(0, str.lastIndexOf('/'))
  await mkdir(new URL(dir), { recursive: true }).catch(e => {
    console.error(e)
  })
  return writeFile(url, data)
}

class File {
  constructor (pkg, url, hooks = {}) {
    this.pkg = pkg
    this.url = url
    Object.assign(this, { ...noops, ...hooks })
    this.parsed = this.parse()
  }

  async parse () {
    if (this.parsed) throw new Error(`Already parsed this file ${this.url}`)
    this.onParse(this)

    const data = await readFile(this.url)
    const program = parse(data, { sourceType: 'module', ecmaVersion: 2020, allowHashBang: true })

    const imports = []

    for (let i = 0; i < program.body.length; i++) {
      const node = program.body[i]
      if (node.type === 'ImportDeclaration') {
        imports.push(node.source.value)
      }
    }
    dynamicImports(program).forEach(name => imports.push(name))

    this.esm = generate(program, stropts)

    this.imports = new Map()
    for (const value of imports) {
      if (value.startsWith('.')) {
        const url = new URL(value, this.url)
        this.imports.set(value, this.pkg.file(url))
      } else {
        this.imports.set(value, null)
      }
    }

    await Promise.all([...this.imports.values()].filter(x => x))
    this.onParsed(this)
    return this
  }

  async deflate (dist) {
    const { cwd } = this.pkg
    const path = fileURLToPath(this.url)
    if (!path.startsWith(cwd)) throw new Error('File is not in source directory')
    const rel = path.slice(cwd.length + 1)
    return _writeFile(new URL(dist + '/esm/' + rel), this.esm)
  }
}

const create = async (pkg, url, hooks) => {
  const file = new File(pkg, url, hooks)
  await file.parsed
  return file
}
create.File = File
create.writeFile = _writeFile

export default create
