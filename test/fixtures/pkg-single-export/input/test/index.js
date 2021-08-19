import * as mod from 'pkg-kitchensink'
import secondary from 'pkg-kitchensink/secondary'
import shared from './lib/shared.js'

var window
const type = window ? window.Deno ? 'deno' : 'browser' : 'import'

const same = (x, y) => x === y

export default test => {
  test('sub import', () => {
    same(mod.mod, 'sub')
    same(mod.sub, type)
  })
  test('shared lib', () => {
    same(shared.mod, 'sub')
    same(shared.sub, type)
  })
  test('secondary', () => {
    same(secondary, 'secondary')
  })
}
