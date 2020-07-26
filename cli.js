#!/usr/bin/env node
import argv from './src/argv.js'
import run from './src/run.js'
import seed from './src/seed.js'
// import api from './src/api.js'
import * as registry from './src/registry/index.js'

const [, , command, ...args] = process.argv

const commands = {}

const help = () => {
  if (!command) console.error('Forgot to add a command')
  else if (!commands[command]) console.error(`Unknown command "${command}"`)
  process.exit(1)
}

const helpflags = ['--help', '-h']

commands.help = help
commands.run = args => run(args, { onConsole: console.log, cwd: process.cwd(), stdout: process.stdout })
commands.registry = async args => {
  const subcommand = args.shift()
  const cmd = registry[subcommand]
  if (!cmd) throw new Error('Unknown registry command')
  const opts = await argv(cmd.schema || {})(args)
  cmd(opts)
}
const _argv = argv({})
commands.seed = async args => seed(await _argv(args))

if (!command || !commands[command] || helpflags.includes(command)) help()

commands[command](args)
