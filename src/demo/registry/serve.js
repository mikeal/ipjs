import dagdb from 'dagdb'
import createHandler from 'dagdb/server.js'

export default async () => {
  const db = await dagdb.create('inmem')
  const { Block, store, updater } = db
  const handler = createHandler(Block, store, updater)
  return handler
}
