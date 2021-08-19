import { promises as fs } from 'fs'
import { deepStrictEqual as same } from 'assert'

const eol = Buffer.from('\n')[0]

const strip = buff => {
  if (buff[buff.byteLength - 1] === eol) {
    return buff.slice(0, buff.byteLength -2)
  }
  return buff
}

const verify = async (comp, input) => {
  const files = await fs.readdir(comp)
  for (const file of files) {
    const url = new URL(comp + '/' + file)
    const inputURL = new URL(input + '/' + file)
    const stat = await fs.stat(url)
    if (stat.isDirectory()) {
      await verify(url, inputURL)
    } else {
      const valid = strip(await fs.readFile(url))
      const data = strip(await fs.readFile(inputURL))
      same(valid.toString(), data.toString())
    }
  }
}

export default verify