#!/usr/bin/env node

import { fileURLToPath } from 'url'
import { dirname } from 'path'

import { build } from '../src/commands/build.js'
import { init } from '../src/commands/init.js'
import { help } from '../src/commands/help.js'
import { template } from '../src/commands/template.js'

import { log } from '../src/utils/logService.js'
import { parseArgs } from '../src/utils/functions.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const cmd = (args._[0]).toLowerCase()

  const commands = {
    // Init Command
    init: async () => {
      await init(
        args._[1] || 'minimaz-project',
        { template: args.template || args.t || 'default' }
      )
    },

    // Build Command
    build: async () => build(),

    // Help Command
    help: () => help(),

    // Template Command
    template: async () => {
      await template(
        args._[1],
        { list: args.l || args.list, delete: args.d || args.delete }
      )
    },

    // Aliases
    i: () => commands.init(),
    b: () => commands.build(),
    h: () => commands.help(),
    t: () => commands.template()
  }

  try {
    if (commands[cmd]) { await commands[cmd]() }
    else {
      log('error', `Unknown command '${cmd}'. Use 'minimaz help' to see available commands.`)
      commands['help']()
    }
  } catch (e) {
    log(
      'error', e instanceof Error
      ? process.env.DEBUG ? e.stack : e.message
      : e
    )
    process.exit(1)
  }
}

main()