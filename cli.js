#!/usr/bin/env node
import argv from './argv.js'

const [ , , command, ...args ] = process.argv

const commands = {}

const help = () => {
  if (!command) console.error('Forgot to add a command')
  else if (!commands[command]) console.error(`Unknown command "${command}"`)
  process.exit(1)
}

const run = async args => {
  const target = args.shift()
  if (!target) throw new Error('Missing target file or package name in registry')
  const module = await import(new URL(target, import.meta.url))
  let fn
  let parse = argv({})
  if (module.main) {
    fn = module.main
    if (module.schema) parse = argv(module.schema)
  } else if (module.default) {
    fn = module.default
  } else {
    throw new Error('Package exports does not match main function signature TODO: insert link')
  }
  return fn(await parse(args))
}

const helpflags = ['--help', '-h']

commands.help = help
commands.run = run

if (!command || !commands[command] || helpflags.includes(command)) help()

commands[command](args)
