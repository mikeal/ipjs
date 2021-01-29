'use strict';

var browser$1 = require('../src/browser.js');
var secondary = require('../src/secondary.js');
require('./lib/shared.js');
var sub = require('../src/sub.js');
var browser = require('../src/sub/browser.js');

var window;
const type = window ? window.Deno ? 'deno' : 'browser' : 'import';
const same = (x, y) => x === y;
var testBasics = test => {
  test('sub import', () => {
    same(sub, 'sub');
    same(browser, type);
  });
  test('shared lib', () => {
    same(browser$1.mod, 'sub');
    same(browser$1.sub, type);
  });
  test('secondary', () => {
    same(secondary, 'secondary');
  });
};

module.exports = testBasics;
