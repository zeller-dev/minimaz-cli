#!/usr/bin/env node
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs-extra'

import { build } from '../src/commands/build.js'
import { init } from '../src/commands/init.js'
import { help } from '../src/commands/help.js'
import { template } from '../src/commands/template.js'

import { log } from '../src/utils/logService.js'
import { parseArgs } from '../src/utils/functions.js'
import { clear } from '../src/commands/clear.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read version from package.json dynamically
const pkgPath = join(__dirname, '../package.json')
const pkgJson = await fs.readJson(pkgPath)
const version = pkgJson.version as string

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const cmd = (args._[0] || '').toLowerCase()

  type CommandFn = () => Promise<void> | void

  const commands: Record<string, CommandFn> = {
    // Init Command
    init: async () => {
      await init(args._[1] || 'minimaz-project', {
        template: args.template || args.t || 'default'
      })
    },

    // Build Command
    build: async () => build(),

    // Clear Command
    clear:  () => clear(),

    // Help Command
    help: () => help(),

    // Template Command
    template: async () => {
      await template(args._[1], {
        list: args.l || args.list,
        delete: args.d || args.delete,
        update: args.u || args.update
      } as any)
    },

    // Version
    version: () => console.log(version),

    // Aliases
    i: () => commands.init(),
    b: () => commands.build(),
    h: () => commands.help(),
    t: () => commands.template(),
    v: () => commands.version()
  }

  try {
    if (commands[cmd]) {
      await commands[cmd]()
    } else {
      log('error', `Unknown command '${cmd}'. Use 'minimaz help' to see available commands.`)
      commands.help()
    }
  } catch (e: any) {
    log(
      'error',
      e instanceof Error
        ? process.env.DEBUG ? e.stack ?? e.message : e.message
        : String(e)
    )
    process.exit(1)
  }
}

main()