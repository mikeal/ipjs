import argv from './argv.js'

const fromModule = module => {
  let fn
  let parse = argv({})
  let schema
  if (module.main) {
    fn = module.main
    if (module.schema) {
      parse = argv(module.schema)
      schema = module.schema
    }
  } else if (module.default) {
    fn = module.default
  } else {
    throw new Error('Package exports does not match main function signature TODO: insert link')
  }
  return { fn, parse, schema }
}

export { fromModule }
