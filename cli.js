#!/usr/bin/env node
import argv from './src/argv.js'
import build from './src/build.js'
import { execSync } from 'child_process'
// import run from './src/run.js'
// import { createServer } from './src/serve.js'
// import seed from './src/seed.js'
// import api from './src/api.js'
// import * as registry from './src/registry/index.js'

const [, , command, ...args] = process.argv

const commands = {}

const help = () => {
  if (!command) console.error('Forgot to add a command')
  else if (!commands[command]) console.error(`Unknown command "${command}"`)
  process.exit(1)
}

const helpflags = ['--help', '-h']

const nodeEnv = { onConsole: console.log, cwd: process.cwd(), stdout: process.stdout }

commands.help = help
// commands.run = args => run(args, nodeEnv)

// Future Demo
/*
commands.registry = async args => {
  const subcommand = args.shift()
  const cmd = registry[subcommand]
  if (!cmd) throw new Error('Unknown registry command')
  const opts = await argv(cmd.schema || {})(args)
  cmd(opts)
}
commands.serve = async args => {
  const filename = args.shift()
  const server = await createServer(filename, process.cwd())
  await new Promise((resolve, reject) => {
    server.listen(8282, e => {
      if (e) reject(e)
      resolve()
    })
  })
  console.log(`Serving ${filename} on http://localhost:8282`)
}
commands.seed = async args => seed(await _argv(args))
*/

const _argv = argv({})

commands.build = async args => build({ ...await argv(build.schema)(args), ...nodeEnv })

commands.publish = async args => {
  const pkg = await commands.build(args)
  // execSync('npm publish', { cwd: pkg.cwd })
}

if (!command || !commands[command] || helpflags.includes(command)) help()

commands[command](args)
