var window
const type = window ? window.Deno ? 'deno' : 'browser' : 'import'

import * as mod from 'pkg-kitchensink'

const same = (x, y) => x === y

export default test => {
  test('sub import', () => {
    same(mod.mod, 'sub')
    same(mod.sub, type)
  })
}
