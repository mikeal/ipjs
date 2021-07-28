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

