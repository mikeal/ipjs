import acorn from 'acorn'
import astring from 'astring'
import { promises as fs } from 'fs'
import path from '../path-to-url.js'

const { parse } = acorn
const { generate } = astring

const copy = o => JSON.parse(JSON.stringify(o))

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
    const esm = copy(program)
    const cjs = copy(program)

    this.imports = new Map()

    for (let i = 0; i < program.body.length; i++) {
      const node = program.body[i]
      if (node.type === 'ImportDeclaration') {
        if (node.source.value.startsWith('.')) {
          const url = new URL(node.source.value, this.url)
          this.imports.set(node.source.value, this.pkg.file(url))
          const l = node.source.value.length

          // re-write cjs import to use extension
          const source = cjs.body[i].source
          source.value = source.value.slice(0, l - '.js'.length) + '.cjs'
          const s = source.raw[0]
          source.raw = [s, source.value, s].join('')
          console.log(cjs.body[i])
        } else {
          console.log({node})
          throw new Error('Not implemented')
        }
      }
    }
    console.log(generate(cjs))
  }
}

export default async (pkg, url) => {
  const file = new File(pkg, url)
  await file.parsed
  return file
}
