
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

This may look like it's dynamically linked but it actually isn't because a browser
request for `http://registry/mypkg` returns a forward to `https://registry/{hash}/browser/`

And of course, we can look at the ETAG to do HTTP Push of **only** the files that have
changed since the prior version of that package request.

```sh
type Dependencies { String: Package }

# Directory is a UnixFSv2 directory
type Package struct {
  name String
  deps Dependencies

  lambda optional Directory
  nodejs optional Directory
  deno optional Directory
  browser optional Directory
}
```
