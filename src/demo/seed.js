import pkg from './pkg/index.js'
import IPFS from 'ipfs'

const seed = async opts => {
  const ipfs = await IPFS.create()
  const { args: [filename] } = opts
  let last
  for await (const block of pkg(filename)) {
    const data = block.encode()
    const cid = await block.cid()
    await ipfs.block.put(data, { cid: cid.toString() })
    last = block
  }
  const cid = await last.cid()
  console.log(`Seeding ipfs:${cid.toString()}`)
}

export default seed
