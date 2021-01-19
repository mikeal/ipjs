import { readFileSync } from 'fs'
import Block from '@ipld/block/defaults.js'

const encode = obj => Block.encoder(obj, 'dag-cbor')

const createPackage = async function * (seedFile) {
  const block = encode({ nodejs: readFileSync(seedFile) })
  yield block
}

export default createPackage
