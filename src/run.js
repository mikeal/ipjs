import pathToUrl from './path-to-url.js'
import argv from './argv.js'
import api from './api.js'

const run = async (args, {onConsole, cwd, stdout}) => {
  const target = args.shift()
  if (!target) throw new Error('Missing target file or package name in registry')
  const module = await import(pathToUrl(target, cwd))
  let fn
  let parse = argv({})
  if (module.main) {
    fn = module.main
    if (module.schema) parse = argv(module.schema)
  } else if (module.default) {
    fn = module.default
  } else {
    throw new Error('Package exports does not match main function signature TODO: insert link')
  }
  let ret = await fn({...await parse(args), ...api})
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
