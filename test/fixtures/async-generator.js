const gen = async function * (opts) {
  yield JSON.stringify(opts)
  yield Buffer.from(JSON.stringify(opts))
}

export default opts => gen(opts)
