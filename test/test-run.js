import { deepStrictEqual as same } from 'assert'
import run from '../src/run.js'

export default test => {
  const capture = () => {
    const data = []
    const onConsole = (...args) => data.push(args)
    const stdout = { write: (...args) => data.push(args) }
    return { data, onConsole, stdout }
  }
  const cwd = process.cwd()
  const runner = async args => {
    const { data, onConsole, stdout } = capture()
    await run(args, { cwd, onConsole, stdout })
    return data
  }

  const mkboolTrue = (name, filename) => {
    test(name, async () => {
      const data = await runner([filename, '--bool'])
      same(data.length, 1)
      const [[opts]] = data
      same(opts.bool, true)
    })
  }
  mkboolTrue('run default fixture', 'test/fixtures/default.js')
  mkboolTrue('run named fixture', 'test/fixtures/named.js')

  test('run named fixture with schema, no args', async () => {
    const data = await runner(['test/fixtures/named-with-schema.js'])
    same(data.length, 1)
    const [[opts]] = data
    same(opts.bool, false)
  })

  test('run buffer', async () => {
    const data = await runner(['test/fixtures/buffer.js', '--bool'])
    const [[buff]] = data
    same(buff instanceof Uint8Array, true)
    const opts = JSON.parse(buff.toString())
    same(opts.bool, true)
  })

  test('run string', async () => {
    const data = await runner(['test/fixtures/string.js', '--bool'])
    const [[str]] = data
    same(typeof str === 'string', true)
    const opts = JSON.parse(str)
    same(opts.bool, true)
  })

  const mktestgen = (name, filename) => {
    test(name, async () => {
      const data = await runner([filename, '--bool'])
      const [[str], [buff]] = data
      same(typeof str === 'string', true)
      const opts = JSON.parse(str)
      same(opts.bool, true)
      same(buff instanceof Uint8Array, true)
      const opts2 = JSON.parse(buff.toString())
      same(opts, opts2)
    })
  }
  mktestgen('run generator', 'test/fixtures/generator.js')
  mktestgen('run async generator', 'test/fixtures/async-generator.js')
}
