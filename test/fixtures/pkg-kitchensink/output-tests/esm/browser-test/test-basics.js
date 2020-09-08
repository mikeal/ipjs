import * as mod from '../src/browser.js';
import secondary from '../src/secondary.js';
import shared from './lib/shared.js';
var window;
const type = window ? window.Deno ? 'deno' : 'browser' : 'import';
const same = (x, y) => x === y;
export default test => {
  test('sub import', () => {
    same(mod.mod, 'sub');
    same(mod.sub, type);
  });
  test('shared lib', () => {
    same(shared.mod, 'sub');
    same(shared.sub, type);
  });
  test('secondary', () => {
    same(secondary, 'secondary');
  });
};