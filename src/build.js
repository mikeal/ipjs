import packager from './package/index.js'
import { resolve } from 'path'

export default async opts => {
  if (opts.args && opts.args.length) {
    opts.cwd = resolve(opts.args.shift())
    if (opts.args.length) {
      opts.dist = resolve(opts.args.shift())
      if (opts.args.length) throw new Error('Too many arguments')
    }
  }
  if (opts.onConsole) {
    const print = key => f => opts.onConsole(key, f.url.toString())
    opts.hooks = {
      onParse: print('parsing'),
      onParsed: print('parsed'),
      onDeflateStart: print('deflating'),
      onDeflateEnd: print('deflated')
    }
  }
  let pkg = await packager(opts)
  await pkg.parsed
  await pkg.deflate(opts.dist || resolve('dist'))
  await pkg.close()
}
