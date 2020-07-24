import pathToUrl from './path-to-url.js'
import { api as nodeAPI } from './api.js'
import { fromModule } from './util.js'
import http from 'http'

const createHandler = async (args, cwd) => {
  const filename = args.shift()
  const module = await import(pathToUrl(filename, cwd))
  const [fn, parse] = fromModule(module)
  const _handler = async (req, res) => {
    const setHeader = (...args) => res.setHeader(...args)
    const setStatus = code => { res.statusCode = code }

    const api = { ...nodeAPI, setHeader, setStatus, $input: async () => req }

    const ret = await fn({ ...await parse(args), ...api })

    if (typeof ret === 'string' || ret instanceof Uint8Array) {
      return res.end(ret)
    }
    if (typeof ret === 'object') {
      if (ret[Symbol.asyncIterator]) {
        for await (const chunk of ret) {
          if (typeof chunk !== 'string' && !(chunk instanceof Uint8Array)) {
            throw new Error('Generators returned from exported functions can only yield strings and Uint8Arrays')
          }
          res.write(chunk)
        }
        return
      }
      if (ret[Symbol.iterator]) {
        for (const chunk of ret) {
          if (typeof chunk !== 'string' && !(chunk instanceof Uint8Array)) {
            throw new Error('Generators returned from exported functions can only yield strings and Uint8Arrays')
          }
          res.write(chunk)
        }
        return
      }
      // Note: should we exclude any types from being logged?
    }
    res.setHeader('content-type', 'application/json') // Note: is this the right thing to do?
    res.end(JSON.stringify(ret))
  }
  const handler = (req, res) => {
    _handler(req, res).catch(e => {
      res.setHeader('content-type', 'text/plain')
      res.statusCode = 500
      res.end([e.message, e.stack].join('\n'))
    })
  }
  return handler
}

const createServer = async (args, cwd) => {
  const server = http.createServer(await createHandler(args))
  return server
}

export { createServer, createHandler }
