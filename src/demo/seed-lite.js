import pkg from './pkg/index.js'
import ipfs from '@textile/ipfs-lite'
import storage from 'interface-datastore'
const { Peer, BlockStore, Block } = ipfs
const { MemoryDatastore } = storage

const store = new BlockStore(new MemoryDatastore())

const seed = async opts => {
  const { args: [filename] } = opts
  let last
  for await (const block of pkg(filename)) {
    const data = block.encode()
    const cid = await block.cid()
    await store.put(new Block(data, cid))
    last = block
  }
  const cid = await last.cid()
  const lite = new Peer(store)
  console.log({ lite })
  await lite.start()
  console.log(`Seeding ipfs:${cid.toString()}`)
}

export default seed
