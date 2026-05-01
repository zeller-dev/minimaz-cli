import {
    Args
} from "./index.js"

/**
 * Parses raw CLI arguments into a structured object.
 *
 * @param rawArgs - Array of raw arguments from CLI
 * @returns Parsed arguments object
 */
export function parseArgs(
    rawArgs: string[]
): Args {
    const args: Args = { _: [] }

    for (let i = 0; i < rawArgs.length; i++) {
        const arg: string = rawArgs[i].toLowerCase()

        // Positional argument
        if (!arg.startsWith("-")) {
            args._.push(arg)
            continue
        }

        // --key=value syntax
        if (arg.startsWith("--") && arg.includes("=")) {
            const [key, value]: string[] = arg.slice(2).split("=")
            args[key] = value
            continue
        }

        const key: string = arg.replace(/^-+/, "")
        const next: string = rawArgs[i + 1]

        if (next && !next.startsWith("-")) {
            args[key] = next
            i++
        } else {
            args[key] = true
        }
    }
    return args
}
