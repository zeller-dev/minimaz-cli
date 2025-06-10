#!/usr/bin/env node

import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'

import { build } from '../src/commands/build.js'
import { init } from '../src/commands/init.js'
import { help } from '../src/commands/help.js'
import { run } from '../src/commands/run.js'
import { log } from '../src/utils/logService.js'
import { parseArgs } from '../src/utils/functions.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env file from root
dotenv.config({ path: resolve(__dirname, '../.env') })

async function main() {
    const args = parseArgs(process.argv.slice(2))
    const cmd = (args._[0] || '').toLowerCase()

    try {
        switch (cmd) {
            case 'init':
            case 'i': {
                const projectName = args._[1] || process.env.DEFAULT_PROJECT_NAME || 'project'
                const template = args.template || args.t || process.env.DEFAULT_TEMPLATE || 'default'
                await init(projectName, { template })
                break
            }

            case 'build':
            case 'b':
                await build()
                break

            case 'help':
            case 'h':
                await help()
                break

            case 'run':
            case 'r':
                await run()
                break

            default:
                log('❌', 'error', `Unknown command '${cmd}'. Use 'minimaz help' to see available commands.`)
                process.exit(1)
        }
    } catch (err) {
        log('❌', 'error', err instanceof Error ? err.message : err)
        process.exit(1)
    }
}

main()
