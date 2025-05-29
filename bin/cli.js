#!/usr/bin/env node

import { fileURLToPath } from 'url'
import { dirname } from 'path'
import minimist from 'minimist'
import { build } from '../src/commands/build.js'
import { init } from '../src/commands/init.js'
import { help } from '../src/commands/help.js'
import { log } from '../src/utils/logService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
    const args = minimist(process.argv.slice(2))
    const cmd = (args._[0] || '').toLowerCase()

    try {
        switch (cmd) {
            case 'init':
            case 'i': {
                const projectName = args._[1] || 'minimaz-site'
                const template = args.template || args.t || 'default'
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

            default:
                log('❌', 'error', `Unknown command '${cmd}'. Use 'minimaz help' to see available commands.`)
        }
    } catch (err) {
        log('❌', 'error', err)
        process.exit(1)
    }
}

main()
