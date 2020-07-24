#!/usr/bin/env node
import argv from './src/argv.js'
import run from './src/run.js'
import api from './src/api.js'

const [ , , command, ...args ] = process.argv

const commands = {}

const help = () => {
  if (!command) console.error('Forgot to add a command')
  else if (!commands[command]) console.error(`Unknown command "${command}"`)
  process.exit(1)
}

const helpflags = ['--help', '-h']

commands.help = help
commands.run = args => run(args, { onConsole: console.log, cwd: process.cwd(), stdout: process.stdout })

if (!command || !commands[command] || helpflags.includes(command)) help()

commands[command](args)
