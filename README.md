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

You can also compile a your tests.

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
