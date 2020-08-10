import createHandler from './serve.js'
import pkg from '../pkg/index.js'
import dagdb from 'dagdb'
import http from 'http'

const serve = async opts => {
  const { host, port } = opts
  const server = http.createServer(await createHandler())
  await new Promise((resolve, reject) => {
    server.listen(port, host, e => {
      if (e) return reject(e)
      resolve()
    })
  })
  console.log(`Registry listening on http://${host}:${port}`)
}

serve.schema = { host: 'localhost', port: 8080 }

const publish = async opts => {
  const { url, args: [file, ...names] } = opts
  if (!file) throw new Error('Missing filename to publish')
  if (!names.length) throw new Error('Missing publish names')
  const db = await dagdb.open(url)
  let last
  for await (const block of pkg(file)) {
    await db.store.put(block)
    last = block
  }
  const cid = await last.cid()
  for (const name of names) {
    await db.set(name, last)
    await db.update()
    console.log(`Published ${cid.toString()} to ${url}`)
  }
}

publish.schema = { url: 'http://localhost:8080' }

const client = async opts => {
  opts = { ...client.schema, ...opts }
  if (!opts.name) throw new Error('Missing required argument "name"')
  const db = await dagdb.open(opts.url)
  const pkg = await db.get(opts.name)
  return pkg
}

client.schema = { url: 'http://localhost:8080' }

export { serve, publish, client }
