// adapted from https://nodejs.org/api/path.html#path_path_resolve_paths
const CHAR_FORWARD_SLASH = '/'
const percentRegEx = /%/g
const newlineRegEx = /\n/g
const carriageReturnRegEx = /\r/g
const tabRegEx = /\t/g

export default (filepath, cwd) => {
  let resolved
  if (filepath.startsWith('./')) filepath = filepath.slice(2)
  if (filepath.startsWith('/')) resolved = filepath
  else resolved = (cwd || '') + '/' + filepath

  // path.resolve strips trailing slashes so we must add them back
  const filePathLast = filepath.charCodeAt(filepath.length - 1)
  if ((filePathLast === CHAR_FORWARD_SLASH) &&
      resolved[resolved.length - 1] !== '/') { resolved += '/' }
  const outURL = new URL('file://')
  if (resolved.includes('%')) { resolved = resolved.replace(percentRegEx, '%25') }
  if (resolved.includes('\n')) { resolved = resolved.replace(newlineRegEx, '%0A') }
  if (resolved.includes('\r')) { resolved = resolved.replace(carriageReturnRegEx, '%0D') }
  if (resolved.includes('\t')) { resolved = resolved.replace(tabRegEx, '%09') }
  outURL.pathname = resolved
  return outURL
}
