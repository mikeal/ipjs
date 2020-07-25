import createHandler from './serve.js'
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
  const [ file, name, tag ] = opts.args
  console.log({file, name, tag})
}

export { serve, publish }
