import { log } from "../../shared/logger/index.js"
import {
    commandsHelp,
} from "./constants.js"

import type {
    CommandHelp
} from "./types.js"

/**
 * Display help message.
 * If `cmdName` is provided, show help only for that command.
 * Otherwise, show full help.
 */
export function help(
    cmdName?: string
): void {
    // If specific command requested
    if (cmdName) {
        const cmd: CommandHelp =
            commandsHelp[cmdName]
        if (!cmd) {
            log.default(
                `No help found for: ${cmdName}\n`
            )
            return
        }
        log.default([
            cmd.usage, `\n\t${cmd.description}`
        ])
        if (cmd.options) {
            log.default(`\tOptions:`)
            for (
                const [opt, desc]
                of Object.entries(cmd.options)
            ) {
                log.default(`\t\t${opt}\t${desc}`)
            }
        }
        log.default("")
        return
    }

    // Otherwise, show general help
    log.default(`Usage:\n`)
    for (
        const cmd
        of Object.values(commandsHelp)
    ) {
        log.default([
            cmd.usage,
            `\n\t${cmd.description}`
        ])
        if (cmd.options) {
            log.default(`\tOptions:`)
            for (
                const [opt, desc]
                of Object.entries(cmd.options)
            ) {
                log.default(
                    `\t\t${opt}\t${desc}`
                )
            }
        }
        log.default("")
    }
}