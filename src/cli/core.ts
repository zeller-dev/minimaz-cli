import { log } from "../index.js"
import { Args } from "./index.js"

/**
 * Parses raw CLI arguments into a structured key/value object.
 *
 * Supported formats:
 * - positional args → stored in `_.[]`
 * - --key=value → parsed into key/value pairs
 * - --key value → parsed into key/value pairs
 * - flags → boolean true
 *
 * Note: All keys are normalized to lowercase.
 *
 * @param {string[]} rawArgs - Raw CLI arguments (process.argv slice)
 * @returns {Args} Parsed argument object
 */
export function parseArgs(
    rawArgs: string[]
): Args {
    const args: Args = { _: [] }

    for (let i = 0; i < rawArgs.length; i++) {
        const arg: string = rawArgs[i].toLowerCase()

        // Positional arguments are collected in order
        if (!arg.startsWith("-")) {
            args._.push(arg)
            continue
        }

        // Support: --key=value inline syntax
        if (arg.startsWith("--") && arg.includes("=")) {
            const [key, value]: string[] = arg.slice(2).split("=")
            args[key] = value
            continue
        }

        const key: string = arg.replace(/^-+/, "")
        const next: string = rawArgs[i + 1]

        // If next token is a value, treat as key-value pair
        if (next && !next.startsWith("-")) {
            args[key] = next
            i++
        } else {
            // Otherwise treat as boolean flag
            args[key] = true
        }
    }

    return args
}

/**
 * Initializes CLI runtime environment variables.
 *
 * Side effects:
 * - Sets VERBOSE flag for logging system
 * - Stores CLI working directory
 *
 * @param {boolean} [verbose] - Enables verbose logging when true
 */
export function initEnv(
    verbose?: boolean
): void {
    log("debug", "Initializing environment variables...")

    process.env.VERBOSE = verbose ? "true" : "false"
    log("debug", `VERBOSE = ${process.env.VERBOSE}`)

    process.env.CLI_WORKDIR = process.cwd()
    log("debug", `CLI_WORKDIR = ${process.env.CLI_WORKDIR}`)
}