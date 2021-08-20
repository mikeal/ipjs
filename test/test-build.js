import build from '../src/build.js'
import tempy from 'tempy'
import { fileURLToPath, pathToFileURL } from 'url'
import rmtree from '@tgrajewski/rmtree'
import verify from './fixtures/verify.js'

export default async test => {
  const url = new URL('fixtures/pkg-kitchensink/input', import.meta.url)
  const cwd = fileURLToPath(url)

  test('pkg-kitchensink', async test => {
    const dist = pathToFileURL(await tempy.directory())
    test.after(() => rmtree(fileURLToPath(dist)))
    const opts = { cwd, dist }
    await build(opts)
    await verify(new URL('./output-notests', url), dist)
    await verify(dist, new URL('./output-notests', url))
  })

  test('pkg-kitchensink w/ tests', async () => {
    const dist = pathToFileURL(await tempy.directory())
    process.on('exit', () => rmtree(fileURLToPath(dist)))
    const opts = { cwd, dist, tests: true }
    await build(opts)
    await verify(new URL('./output-tests', url), dist)
    await verify(dist, new URL('./output-tests', url))
    /*
    for (const name of ['browser-tests', 'node-tests']) {
      console.log({name})
      test(`esm/${name}`, async test => {
        const url = new URL('./browser-tests', new URL(dist + '/txt.txt'))
        console.log({url})
      })
    }
    */
  })

  test('pkg-kitchensink w/ main', async test => {
    const dist = pathToFileURL(await tempy.directory())
    test.after(() => rmtree(fileURLToPath(dist)))
    const opts = { cwd, dist, main: true }
    await build(opts)
    await verify(new URL('./output-main', url), dist)
    await verify(dist, new URL('./output-main', url))
  })
}
