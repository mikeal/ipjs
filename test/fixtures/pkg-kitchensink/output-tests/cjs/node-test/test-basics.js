'use strict';

var index$1 = require('../src/index.js');
var secondary = require('../src/secondary.js');
require('./lib/shared.js');
var sub = require('../src/sub.js');
var index = require('../src/sub/index.js');

var window;
const type = window ? window.Deno ? 'deno' : 'browser' : 'import';
const same = (x, y) => x === y;
var testBasics = test => {
  test('sub import', () => {
    same(sub, 'sub');
    same(index, type);
  });
  test('shared lib', () => {
    same(index$1.mod, 'sub');
    same(index$1.sub, type);
  });
  test('secondary', () => {
    same(secondary, 'secondary');
  });
};

module.exports = testBasics;
