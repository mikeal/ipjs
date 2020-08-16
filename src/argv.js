export default schema => {
  let required = []
  for (const [key, value] of Object.entries(schema)) {
    if (value === null) {
      schema[key] = { default: null }
      continue
    }
    if (typeof value === 'boolean') {
      schema[key] = { default: value, type: 'boolean' }
    } else if (typeof value === 'object') {
      if (!value.default) {
        required = [...required, [key, ...(value.aliases || [])]]
      }
      if (value.aliases) {
        value.name = key
        value.aliases.forEach(k => { schema[k] = value })
      }
    }
  }
  return async argv => {
    argv = [...argv]
    const args = { args: [], _schema: schema, _required: required }
    for (const [key, value] of Object.entries(schema)) {
      if (value && typeof value === 'object' && typeof value.default !== 'undefined') {
        args[key] = value.default
      } else if (typeof value !== 'object') {
        args[key] = value
      }
    }
    if (argv.includes('--')) {
      const i = argv.indexOf('--')
      args['--'] = argv.slice(i + 1)
      argv = argv.slice(0, i)
    }
    const handle = async (k, v) => {
      if (!schema[k]) {
        if (typeof v === 'undefined') v = true
        args[k] = v
        return
      }
      const name = schema[k].name || k
      const { type, transform } = schema[name]
      if (transform) {
        v = await transform(v)
      } else if (type === 'boolean') {
        if (v === 'true' || v === 'false') {
          v = JSON.parse(v)
        } else if (typeof v === 'undefined') {
          if (typeof schema[name].default !== 'undefined') v = !schema[name].default
          else v = true
        } else {
          throw new Error('Invalid boolean value')
        }
      }
      /* eslint-disable-next-line */
      if (type && !(typeof v === type)) {
        throw new Error(`Invalid type. ${name} must be of type ${type}`)
      }
      args[name] = v
    }
    const promises = []
    while (argv.length) {
      let part = argv.shift()
      if (part.startsWith('--')) {
        part = part.slice(2)
        if (part.includes('=')) {
          const [k, v] = part.split('=')
          promises.push(handle(k, v))
        } else {
          let value
          if (schema[part] && schema[part].type === 'boolean') {
            // noop
          } else {
            value = argv.shift()
          }
          promises.push(handle(part, value))
        }
      } else if (part.startsWith('-')) {
        part = part.slice(1)
        if (part.length === 1 && schema[part] && schema[part].type !== 'boolean' &&
             argv.length && !argv[0].startsWith('-')) {
          promises.push(handle(part, argv.shift()))
          continue
        }
        for (const alias of part.split('')) {
          let value
          if (schema[alias] && schema[alias].default && typeof schema[alias].default === 'boolean') {
            value = !schema[alias].default
          } else {
            value = true
          }
          promises.push(handle(alias, value))
        }
      } else {
        args.args.push(part)
      }
    }
    return args
  }
}
