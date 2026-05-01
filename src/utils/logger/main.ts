import {
    // --- CONSTANTS ---
    colors, prefix,

    // --- FUNCTIONS ---
    colorize, formatTs,

    // --- TYPES ---
    LogType

} from "./index.js"

/**
 * Logs a message to the console with a level-specific prefix.
 *
 * Behavior:
 * - Prepends a colored prefix based on `type`
 * - Includes a timestamp only when VERBOSE=true
 * - Suppresses "debug" logs unless VERBOSE=true
 *
 * Environment:
 * - VERBOSE=true → enables debug logs and timestamps
 *
 * @param {LogType} [type="info"] - Log level
 * @param {string} message - Message to print
 */
export function log(
    type: LogType = "info",
    message: string
): void {

    const isVerbose: boolean =
        process.env.VERBOSE === "true"

    // Skip debug logs unless explicitly enabled
    if (type === "debug" && !isVerbose) return

    // Timestamp is optional and treated as secondary metadata
    const ts = isVerbose
        ? colorize(`[${formatTs()}] `, colors.gray)
        : ""

    const output: string =
        `${ts}${prefix[type]} ${message}`

    // Route to appropriate console method
    switch (type) {
        case "error":
            console.error(output)
            break
        case "warn":
            console.warn(output)
            break
        default:
            console.log(output)
            break
    }
}

/**
 * @TODO:
 * - Extract logging utilities into a standalone package
 * - Add log level filtering beyond VERBOSE (e.g. LOG_LEVEL)
 */