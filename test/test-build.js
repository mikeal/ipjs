import build from '../src/build.js'
import tempy from 'tempy'
import { promises as fs } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import rmtree from '@tgrajewski/rmtree'
import { deepStrictEqual as same } from 'assert'

export default async test => {
  test('pkg-kitchensink', async test => {
    const dist = pathToFileURL(await tempy.directory())
    const url = new URL('fixtures/pkg-kitchensink/input', import.meta.url)
    const cwd = fileURLToPath(url)
    test.after(() => rmtree(fileURLToPath(dist)))
    const opts = { cwd, dist }
    await build(opts)

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
    await verify(new URL('./output-notests', url), dist)
    await verify(dist, new URL('./output-notests', url))
  })
}
