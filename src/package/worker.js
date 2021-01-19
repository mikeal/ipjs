import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'
import { fileURLToPath } from 'url'
import { promises as fs } from 'fs'
import acorn from 'acorn'
import astring from 'escodegen'
import convert from '../../../esm-ast-to-cjs/index.js'

const { parse } = acorn
const { generate } = astring
const stropts = { format: { indent: { style: '  ' } } }

const { writeFile, readFile, mkdir } = fs

class Compiler {
  constructor (file) {
    this.file = file
    const worker = new Worker(new URL(import.meta.url), { workerData: file.toString() })
    worker.on('message', this.dispatch.bind(this))
    worker.on('error', e => { throw e })
    worker.on('exit', (code) => {
      if (code !== 0) {
        throw new Error(`Worker stopped with exit code ${code}`)
      }
    })
    this.worker = worker
    this.handles = new Map()
    this.imports = this.register('init')
  }

  register (id) {
    return new Promise((resolve, reject) => {
      this.handles.set(id, [resolve, reject])
    })
  }

  deflate (...args) {
    const id = Math.random()
    this.worker.postMessage({ id, cmd: 'deflate', args })
    return this.register(id)
  }

  dispatch ({ id, ret, err }) {
    const [resolve, reject] = this.handles.get(id)
    if (err) reject(err)
    else resolve(ret)
  }
}

const run = async () => {
  const url = new URL(workerData)
  const data = await readFile(url)
  const program = parse(data, { sourceType: 'module' })

  const imports = []

  const cjs = { ...program, body: [...program.body] }

  for (let i = 0; i < program.body.length; i++) {
    const node = program.body[i]
    if (node.type === 'ImportDeclaration') {
      imports.push(node.source.value)
      // TODO: re-write to cjs import
    }
    // TODO: re-write cjs exports
  }

  const _writeFile = async (url, data) => {
    const str = url.toString()
    const dir = str.slice(0, str.lastIndexOf('/'))
    await mkdir(new URL(dir), { recursive: true }).catch(e => {
      console.error(e)
    })
    return writeFile(url, data)
  }

  const commands = {}
  commands.deflate = async (dist, cwd) => {
    const path = fileURLToPath(url)
    if (!path.startsWith(cwd)) throw new Error('File is not in source directory')
    const rel = path.slice(cwd.length + 1)
    await Promise.all([
      _writeFile(new URL(dist + '/esm/' + rel), esmCompile),
      _writeFile(new URL(dist + '/cjs/' + rel), cjsCompile)
    ])
    return true
  }
  parentPort.on('message', async ({ id, cmd, args }) => {
    const ret = await commands[cmd](...args)
    parentPort.postMessage({ id, ret })
  })
  parentPort.postMessage({ id: 'init', ret: imports })
  convert(cjs)
  const cjsCompile = generate(cjs, stropts)
  const esmCompile = generate(program, stropts)
}

let mod = null
if (isMainThread) {
  mod = filename => new Compiler(filename)
} else {
  run()
}
export default mod
