#!/usr/bin/env node
import {
    // --- COMMANDS ---
    build, clear, config, help, init, template, validate, version,

    // --- FUNCTIONS ---
    log,

    // --- TYPES ---
    CommandFn, InitCommandOptions, TemplateCommandOptions
} from "../index.js"

import {
    // --- FUNCTIONS ---
    parseArgs, initEnv,

    // --- TYPES ---
    Args
} from "./index.js"

/**
 * Post-install hook detection.
 *
 * If the CLI is executed during npm postinstall,
 * delegate to the postInstall routine and exit immediately.
 */
if (process.env.npm_lifecycle_event === "postinstall") {
    import("../utils/postInstall.js")
        .then(({ postInstall }) => postInstall())

    process.exit(0)
}

/**
 * CLI entrypoint.
 *
 * Responsibilities:
 * - Parse CLI arguments
 * - Initialize runtime environment
 * - Dispatch command execution
 * - Handle errors consistently
 */
async function main(): Promise<void> {
    const args: Args = parseArgs(process.argv.slice(2))

    const cmd: string = args._[0] || ""     // primary command
    const subArg: string = args._[1]        // optional positional argument

    initEnv(Boolean(args.v))

    // Optional help shortcut (early exit)
    if (cmd === "help" || args.help || args.h) {
        help(
            subArg || (args.help || args.h ? cmd : undefined)
        )
        process.exit(0)
    }

    /**
     * Command registry.
     *
     * Each command is mapped to a function that encapsulates
     * its execution logic. Aliases are included for convenience.
     */
    const commands: Record<string, CommandFn> = {
        build: async () => build(),

        clear: () => clear(),

        config: async () =>
            config(
                args.overwrite === true || args.overwrite === "true"
            ),

        init: async () => {
            await init(
                subArg || "minimaz-project",
                {
                    template: args.template || args.t || "default",
                    npm: args.npm,
                    git: args.git,
                    gitremote: args.gitremote,
                    gitprovider: args.gitprovider
                } as InitCommandOptions
            )
        },

        template: async () => {
            await template(
                {
                    list: args.list || args.l,
                    delete: args.delete || args.d,
                    update: args.update || args.u
                } as TemplateCommandOptions,
                subArg
            )
        },

        validate: async () => {
            await validate(String(args.path))
        },

        version: () => version(),

        /**
         * Command aliases (short forms)
         */
        b: () => commands.build(),
        c: () => commands.clear(),
        i: () => commands.init(),
        t: () => commands.template(),
        v: () => commands.version()
    }

    try {
        if (commands[cmd]) {
            log("info", `Executing command "${cmd}"...`)
            await commands[cmd]()
        } else {
            log(
                "error",
                `Unknown command "${cmd}". Use "minimaz help" to see available commands.`
            )
            help()
        }
    } catch (error: unknown) {
        /**
         * Unified error handling:
         * - In DEBUG mode: show full stack trace
         * - Otherwise: show only message
         */
        const isDebug = process.env.DEBUG === "true"

        const message =
            error instanceof Error
                ? isDebug
                    ? error.stack ?? error.message
                    : error.message
                : String(error)

        log("error", message)
        process.exit(1)
    }
}

/**
 * Execute CLI.
 * Top-level async entrypoint wrapper.
 */
main()

/**
 * TODO:
 * - Move CLI entry to src/cli/
 * - Add --path support for external project targets
 * - Improve command validation layer (pre-dispatch schema check)
 */