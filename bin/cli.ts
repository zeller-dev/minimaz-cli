#!/usr/bin/env node
import {
    build, init, help, template, clear, version, config,          // commands
    log, parseArgs, initEnv,                                      // utils
    CommandFn, templateCommandOptions, initCommandOptions, Args   // types
} from '../src/index.js'

if (process.env.npm_lifecycle_event === 'postinstall') {
    import('../src/utils/postInstall.js').then(({ postInstall }) => postInstall())
    process.exit(0)
}

// TODO add path logic

/**
 * Main CLI entrypoint
 */
async function main(): Promise<void> {
    // Parse raw CLI arguments (remove "node" and script path)
    const args: Args = parseArgs(process.argv.slice(2))
    const cmd: string = (args._[0] || '')   // primary command
    const subArg: string = args._[1]        // optional argument (e.g., project name)

    initEnv(Boolean(args.v))

    /**
     * =============================
     * HELP HANDLING (EARLY EXIT)
     * =============================
     */

    // Show help if requested
    if (cmd === 'help' || args.h || args.help) {
        help(subArg || (args.h || args.help ? cmd : undefined))
        process.exit(0)
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

        // Config command
        config: async () => config(Boolean(args.overwrite === true || args.overwrite === 'true')),

        // Init command with optional template
        init: async () => {
            await init(
                subArg || 'minimaz-project',
                {
                    template: args.template || args.t || 'default',
                    npm: args.npm,
                    git: args.git,
                    gitremote: args.gitremote,
                    gitprovider: args.gitprovider
                } as initCommandOptions)
        },

        // Template command with list/delete/update options
        template: async () => {
            await template(
                {
                    list: args.l || args.list,
                    delete: args.d || args.delete,
                    update: args.u || args.update
                } as templateCommandOptions),
                subArg
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
            log('info', `Executing command '${cmd}'...`)
            await commands[cmd]()
        }
        else {
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