import worker from './worker.js'

const noop = () => {}

const noops = {
  onParse: noop,
  onParsed: noop,
  onDeflateStart: noop,
  onDeflateEnd: noop
}

class File {
  constructor (pkg, url, hooks={}) {
    this.pkg = pkg
    this.url = url
    Object.assign(this, { ...noops, ...hooks})
    this.parsed = this.parse()
  }

  async parse () {
    if (this.parsed) throw new Error(`Already parsed this file ${this.url}`)
    this.onParse(this)
    this.worker = worker(this.url.toString())
    this.imports = new Map()
    const imports = await this.worker.imports
    for (const value of imports) {
      if (value.startsWith('.')) {
        const url = new URL(value, this.url)
        this.imports.set(value, this.pkg.file(url))
      } else {
        console.log({ value })
        throw new Error('Not implemented')
      }
    }

    await Promise.all([...this.imports.values()])
    this.onParsed(this)
    return this
  }

  async deflate (dist) {
    this.onDeflateStart(this, dist)
    await this.worker.deflate(dist.toString(), this.pkg.cwd.toString())
    this.onDeflateEnd(this, dist)
  }
}

export default async (pkg, url, hooks) => {
  const file = new File(pkg, url, hooks)
  await file.parsed
  return file
}
