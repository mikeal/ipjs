import pathToUrl from './path-to-url.js'
import api from './api.js'
import { client } from './registry/index.js'
import { fromModule } from './util.js'
import { promises as fs } from 'fs'

const run = async (args, { onConsole, cwd, stdout }) => {
  const target = args.shift()
  if (!target) throw new Error('Missing target file or package name in registry')
  let module
  if (target.startsWith('@')) {
    const name = target.slice('@ipjs/'.length)
    const pkg = await client({name, url: 'http://localhost:8080'})
    const buffer = Buffer.from(pkg.nodejs)
    module = await import(`data:text/javascript,${buffer.toString()}`)
  } else {
    module = await import(pathToUrl(target, cwd))
  }
  const { fn, parse } = fromModule(module)
  const ret = await fn({ ...await parse(args), ...api })
  if (typeof ret === 'string') return onConsole(ret)
  if (ret instanceof Uint8Array) return stdout.write(ret)
  if (typeof ret === 'object') {
    if (ret[Symbol.asyncIterator]) {
      for await (const chunk of ret) {
        if (typeof chunk !== 'string' && !(chunk instanceof Uint8Array)) {
          throw new Error('Generators returned from exported functions can only yield strings and Uint8Arrays')
        }
        stdout.write(chunk)
      }
      return
    }
    if (ret[Symbol.iterator]) {
      for (const chunk of ret) {
        if (typeof chunk !== 'string' && !(chunk instanceof Uint8Array)) {
          throw new Error('Generators returned from exported functions can only yield strings and Uint8Arrays')
        }
        stdout.write(chunk)
      }
      return
    }
    // Note: should we exclude any types from being logged?
  }
  onConsole(ret)
}

export default run
