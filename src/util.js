import argv from './argv.js'

const fromModule = module => {
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
  return [fn, parse]
}

export { fromModule }
