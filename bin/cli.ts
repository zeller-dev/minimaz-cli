#!/usr/bin/env node
import { fileURLToPath } from 'url'
import { dirname } from 'path'

import {
  build, init, help, template, clear, version,
  log, parseArgs, CommandFn
} from '../src/index.js'

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

  // Show help if requested
  if (cmd === 'help' || args.h || args.help) {
    help(subArg || (args.h || args.help ? cmd : undefined))
    return
  }

  /**
   * =============================
   * COMMAND DISPATCH
   * =============================
   */

  const commands: Record<string, CommandFn> = {
    // Build command
    build: async () => build(),

    // Clear command
    clear: () => clear(),

    // Init command with optional template
    init: async () => {
      await init(subArg || 'minimaz-project', {
        template: args.template || args.t || 'default',
        npm: args.npm,
        git: args.git
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
  } catch (error: any) {
    // Catch any runtime error and log it
    log(
      'error',
      error instanceof Error
        ? process.env.DEBUG
          ? error.stack ?? error.message
          : error.message
        : String(error)
    )
    process.exit(1)
  }
}

// Run the CLI
main()