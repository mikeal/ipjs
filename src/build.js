import packager from './package/index.js'
import { resolve } from 'path'

export default async opts => {
  if (opts.args.length) {
    opts.cwd = resolve(opts.args.shift())
    if (opts.args.length) throw new Error('Not supported: multiple build sources')
  }
  const print = key => f => console.log(key, f.url.toString())
  opts.hooks = {
    onParse: print('parsing'),
    onParsed: print('parsed'),
    onDeflateStart: print('deflating'),
    onDeflateEnd: print('deflated')
  }
  let pkg = await packager(opts)
  await pkg.parsed
  await pkg.deflate(resolve('dist'))
  await pkg.close()
}
