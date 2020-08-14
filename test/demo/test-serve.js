import getport from 'get-port'
import bent from 'bent'
import { createServer } from '../src/demo/serve.js'
import { deepStrictEqual as same } from 'assert'

const cwd = process.cwd()
const getServer = async filename => {
  const server = await createServer(filename, cwd)
  let port
  await new Promise((resolve, reject) => {
    port = getport()
    port.then(port => {
      server.listen(port, e => {
        if (e) return reject(e)
        resolve()
      })
    })
  })
  return { port: await port, server }
}

const close = server => new Promise((resolve, reject) => {
  server.close(e => {
    if (e) return reject(e)
    resolve()
  })
})

const setup = async (test, filename) => {
  const { port, server } = await getServer(filename)
  test.after(() => close(server))
  return `http://localhost:${port}`
}

const query = (url, opts) => {
  const get = bent(url, 'json')
  const query = [...Object.entries(opts)].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  return get('?' + query)
}

export default test => {
  test('default', async test => {
    const url = await setup(test, 'test/fixtures/default.js')
    const ret = await query(url, { bool: true })
    same(ret.bool, true)
  })
}
