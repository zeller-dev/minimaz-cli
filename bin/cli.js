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
  const cmd = (args._[0] || '').toLowerCase()

  const commands = {
    init: async () => {
      const projectName = args._[1] || 'minimaz-project'
      const templateName = args.template || args.t || 'default'
      await init(projectName, { template: templateName })
    },
    i: () => commands.init(),

    build: () => build(),
    b: () => commands.build(),

    help: () => help(),
    h: () => commands.help(),

    template: async () => {
      const targetPath = args._[1]
      const options = {
        list: args.l || args.list,
        delete: args.d || args.delete
      }
      await template(targetPath, options)
    },
    t: () => commands.template()
  }

  try {
    if (commands[cmd]) {
      await commands[cmd]()
    } else {
      log('error', `Unknown command '${cmd}'. Use 'minimaz help' to see available commands.`)
      process.exit(1)
    }
  } catch (e) {
    log('error', e instanceof Error ? e.message : e)
    process.exit(1)
  }
}

main()