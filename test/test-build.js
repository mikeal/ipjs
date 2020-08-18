import build from '../src/build.js'
import tempy from 'tempy'
import { promises as fs } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import rmtree from '@tgrajewski/rmtree'
import { deepStrictEqual as same } from 'assert'

export default async test => {
  const url = new URL('fixtures/pkg-kitchensink/input', import.meta.url)
  const cwd = fileURLToPath(url)

  const verify = async (comp, input) => {
    const files = await fs.readdir(comp)
    for (const file of files) {
      const url = new URL(comp + '/' + file)
      const inputURL = new URL(input + '/' + file)
      const stat = await fs.stat(url)
      if (stat.isDirectory()) {
        await verify(url, inputURL)
      } else {
        const valid = fs.readFile(url)
        const data = fs.readFile(inputURL)
        same(valid, data)
      }
    }
  }

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
}
