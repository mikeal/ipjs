import acorn from 'acorn'
import { promises as fs } from 'fs'
import worker from './worker.js'

const { parse } = acorn

class File {
  constructor (pkg, url) {
    this.pkg = pkg
    this.url = url
    this.parsed = this.parse()
  }

  async parse () {
    if (this.parsed) throw new Error(`Already parsed this file ${this.url}`)
    const data = await fs.readFile(this.url)

    const program = parse(data, { sourceType: 'module' })

    this.imports = new Map()

    for (let i = 0; i < program.body.length; i++) {
      const node = program.body[i]
      if (node.type === 'ImportDeclaration') {
        if (node.source.value.startsWith('.')) {
          const url = new URL(node.source.value, this.url)
          this.imports.set(node.source.value, this.pkg.file(url))
        } else {
          console.log({ node })
          throw new Error('Not implemented')
        }
      }
    }
    this.data = worker(program)
    return this
  }

  async deflate (dist) {
    const data = await this.data
    const input = { input: this.url.toString() }
    const output = { format: 'cjs' }
    const rel = this.pkg.relative(this)
    await Promise.all([
      this.writeFile(new URL('esm/' + rel, dist), data),
      this.writeFile(new URL('cjs/' + rel, dist), data) // TODO: replace with cjs compile
    ])
    return this
  }

  async writeFile (url, data) {
    const str = url.toString()
    const dir = str.slice(0, str.lastIndexOf('/'))
    await fs.mkdir(new URL(dir), { recursive: true }).catch(e => {
      console.error(e)
    })
    return fs.writeFile(url, data)
  }
}

export default async (pkg, url) => {
  const file = new File(pkg, url)
  await file.parsed
  return file
}
