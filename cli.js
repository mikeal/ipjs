#!/usr/bin/env node
import argv from './src/argv.js'
import build from './src/build.js'
import { spawnSync } from 'child_process'
import { promises as fs } from 'fs'
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

commands.build = async args => build({ ...await argv(build.schema)(args), ...nodeEnv })

commands.publish = async args => {
  const cwd = process.cwd() // we do not support positional options for cwd in publish
  const packagejson = JSON.parse(await fs.readFile(cwd + '/package.json'))
  if (packagejson.scripts.build) {
    spawnSync('npm', ['run', 'build'], { stdio: 'inherit' })
  } else {
    await commands.build(args)
    await fs.copyFile(cwd + '/README.md', cwd + '/dist/README.md').catch(() => {})
  }
  spawnSync('npm', ['publish', cwd + '/dist', '--verbose'], { stdio: 'inherit' })
}

if (!command || !commands[command] || helpflags.includes(command)) help()

commands[command](args)
