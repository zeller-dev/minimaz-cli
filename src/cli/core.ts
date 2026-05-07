import {
    config
} from "../commands/index.js"

import {
    log
} from "../shared/index.js"

import type {
    Args
} from "./types.js"

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
        if (
            arg.startsWith("--")
            && arg.includes("=")
        ) {
            const [key, value]: string[] =
                arg.slice(2).split("=")
            args[key] = value
            continue
        }

        const key: string =
            arg.replace(/^-+/, "")
        const next: string =
            rawArgs[i + 1]

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
    verbose?: boolean,
    path?: string
): void {

    process.env.VERBOSE =
        verbose
            ? "true"
            : "false"

    process.env.CLI_WORKDIR =
        path ?? process.cwd()

    log.info([
        "Initializing environment variables",
        `CLI_WORKDIR = ${process.env.CLI_WORKDIR}`,
        `VERBOSE = ${process.env.VERBOSE}`,
    ])
}

/**
 * Post-install hook.
 *
 * Ensures default templates/configuration are initialized
 * after package installation.
 *
 * This is typically executed automatically (e.g. via npm/yarn lifecycle).
 * Safe to run multiple times if `config(false)` is idempotent.
 *
 * @returns {Promise<void>}
 */
export async function postInstall(): Promise<void> {
    try {
        log.info(
            "Post install: running"
        )

        // Initialize default configuration/templates without forcing overwrite
        await config(false)

        log.success(
            "Post install: completed"
        )

    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : String(error)

        throw new Error(
            `Post install: Failed\n${message}`,
            { cause: error }
        )
    }
}