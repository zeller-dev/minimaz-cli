#!/usr/bin/env node
import { fileURLToPath } from 'url'
import { dirname } from 'path'

import { build } from '../src/commands/build.js'
import { init } from '../src/commands/init.js'
import { help } from '../src/commands/help.js'
import { template } from '../src/commands/template.js'
import { clear } from '../src/commands/clear.js'
import { version } from '../src/commands/version.js'

import { log } from '../src/utils/logService.js'
import { parseArgs } from '../src/utils/functions.js'

// Resolve the current filename and directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Main CLI entrypoint
 */
async function main(): Promise<void> {
  // Parse raw CLI arguments (remove "node" and script path)
  const rawArgs = process.argv.slice(2)
  const args = parseArgs(rawArgs)

  const cmd = (args._[0] || '').toLowerCase() // primary command
  const subArg = args._[1]                    // optional argument (e.g., project name)

  /**
   * =============================
   * HELP HANDLING (EARLY EXIT)
   * =============================
   */

  // Pattern: minimaz help <command>
  if (cmd === 'help') {
    subArg ? help(subArg) : help()
    return
  }

  // Pattern: minimaz <command> -h | --help
  if (args.h || args.help) {
    cmd ? help(cmd) : help()
    return
  }

  /**
   * =============================
   * COMMAND DISPATCH
   * =============================
   */

  type CommandFn = () => Promise<void> | void

  const commands: Record<string, CommandFn> = {
    // Build command
    build: async () => build(),

    // Clear command
    clear: () => clear(),

    // Init command with optional template
    init: async () => {
      await init(subArg || 'minimaz-project', {
        template: args.template || args.t || 'default'
      })
    },

    // Template command with list/delete/update options
    template: async () => {
      await template(subArg, {
        list: args.l || args.list,
        delete: args.d || args.delete,
        update: args.u || args.update
      } as any)
    },

    // Version command
    version: () => version(),

    /**
     * =============================
     * COMMAND ALIASES
     * =============================
     */
    b: () => commands.build(),
    c: () => commands.clear(),
    i: () => commands.init(),
    t: () => commands.template(),
    v: () => commands.version()
  }

  /**
   * =============================
   * EXECUTE COMMAND OR FALLBACK
   * =============================
   */
  try {
    if (commands[cmd]) {
      await commands[cmd]()
    } else {
      // Unknown command → log error and show general help
      log('error', `Unknown command '${cmd}'. Use 'minimaz help' to see available commands.`)
      help()
    }
  } catch (e: any) {
    // Catch any runtime error and log it
    log(
      'error',
      e instanceof Error
        ? process.env.DEBUG
          ? e.stack ?? e.message
          : e.message
        : String(e)
    )
    process.exit(1)
  }
}

// Run the CLI
main()