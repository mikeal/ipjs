import build from '../src/build.js'
import tempy from 'tempy'
import { fileURLToPath, pathToFileURL } from 'url'
import rmtree from '@tgrajewski/rmtree'
import verify from './fixtures/verify.js'

export default async test => {
  const url = new URL('fixtures/pkg-single-export/input', import.meta.url)
  const cwd = fileURLToPath(url)

  test('pkg-single-export w/ main', async test => {
    const dist = pathToFileURL(await tempy.directory())
    test.after(() => rmtree(fileURLToPath(dist)))
    const opts = { cwd, dist, main: true }
    await build(opts)
    await verify(new URL('./output-main', url), dist)
    await verify(dist, new URL('./output-main', url))
  })
}
