# Universal JavaScript Build and Packaging

This is a toolchain for the next phase of JavaScript development. It
enables developers to write JavaScript modules in ESM that work
universally across many environments (Node.js import, Node.js require,
Browser, Deno, etc).

You start by just writing a standard ESM module. You'll need to include
`"type": "module"` in your package.json, as well as a `"main"` entry
point or an [export map](https://nodejs.org/api/esm.html#esm_package_entry_points).

```
npx ipjs build
```

This will build a package in the `dist` directory that has different
versions of your files compiled for different environments and a
new package.json file that exposes all of these files to the correct
Node.js and compiler entry points.

That's it ;)

You can also compile your tests.

```
npx ipjs build --tests
```

Note: You'll need to use "named self imports", `import mymodule from "mymodule"`,
in your tests so that we can compile different CJS versions of those tests for
Node.js and the browser.

You can publish to by either running `npm publish` in the dist directory or using:

```
npx ipjs publish
```

## Requirements

There's a few Node.js and ESM features you need to stick to using and a few you need
to avoid. Some are because there just isn't a very good way to provide consistent representations
and some are because we need some more explicit information about your library in order
to detect the dependency tree and built it successfully.

### Only use named exports in files in the package.json exports map

If you use default exports from files in the exports map:

- CJS/JSDoc+Typescript users of your module will find that `tsc` fails to compile as it expects a the `.default` property to be present on anything `require`d from your module
- If they switch to `.default` to satisfy `tsc`, node will resolve cjs at runtime via the `"require":` entry from the exports map which does not have a `.default` so will fail
- If they switch back to no `.default`, running bundled cjs in the browser will also fail as it will be supplied the esm version where `.default` is present after all

### Only export individual files in export map (no directories or pattern matching)

### Avoid `instanceof`

The exports map means ESM and CJS environments load the same paths from different files:

```javascript
// package.json
{
  "name": "my-esm-project",
  "exports": {
    "my-class": {
      "import": "esm/src/my-class.js",
      "require": "cjs/src/my-class.js",
    }
  }
  // ...other fields
}
```

If a CJS file uses `instanceof` on an instance of a class loaded from and instantiated in an ESM file (or vice versa), the check will fail, even though there may only be one copy of that dependency in the tree - it's because they've been loaded from different files within that dependency.

For example, consider `my-esm-project`, built with ipjs and published as dual cjs/esm:

```javascript
// is-my-class.cjs
const MyClass = require('my-esm-project/my-class')

module.exports = (obj) => {
  return obj instanceof MyClass
}
```

```javascript
// main.js
import isMyClass from './is-my-class.cjs'
import MyClass from 'my-esm-project/my-class'

const obj = new MyClass()

console.info(isMyClass(obj)) // false - perhaps not what we were expecting
```

It's possible to cross the ESM/CJS boundary like this several times during code execution, sometimes even within the same project so it's recommended not to use `instanceof`.
