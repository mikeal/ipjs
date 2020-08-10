import packager from './package/index.js'
import { resolve } from 'path'

export default async opts => {
  if (opts.args.length) {
    opts.cwd = resolve(opts.args.shift())
    if (opts.args.length) throw new Error('Not supported: multiple build sources')
  }
  const pkg = await packager(opts)
  await pkg.deflate(resolve('dist'))
  console.log({ pkg })
}
