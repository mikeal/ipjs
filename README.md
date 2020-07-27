
# Schema

The directory layout of every package directory looks something like:

```
/mypkg
/mypkg/index.js // imports '#ipjs/two'
/two/index.js
```

Every target is its own directory like this, we don't worry about
overlap in the file contents because DAG de-duplication takes care of this
for us.

This means that an import of `'#ipjs/two'` is re-written simply as `../two/index.js`
for Node.js.

The `broswer-ipjs` build is slightly different. It links every file to `/_ipjs/CID.js`
for maximal caching in the browser.

```sh
type Dependencies { String: Package }

# Directory is a UnixFSv2 directory
type Package struct {
  name String
  deps Dependencies

  lambda optional Directory
  nodejs-esm optional Directory
  nodejs-cjs optional Directory
  deno optional Directory
  browser optional Directory
  browser-esm optional Directory
  browser-ipjs optional Directory
}
```

From all this we can also output a package for npm that works across every environment
using a mix of entry point fields in package.json and a lot of mostly duplicated files.
