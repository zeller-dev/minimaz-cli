import {
    // --- CONSTANTS
    colors, prefix,

    // --- FUNCTIONS ---
    colorize,

    // --- TYPES ---
    LogType
} from "./index.js"

/**
 * Prints a message to console with prefix based on type.
 * Timestamp is shown only when VERBOSE=true.
 */
export function log(
    type: LogType = "info",
    message: string
): void {

    const isVerbose: boolean =
        process.env.VERBOSE === "true"

    // Only print debug messages in verbose mode
    if (type === "debug" && !isVerbose) return

    const ts = isVerbose
        ? colorize(`[${formatTs()}] `, colors.gray)
        : ""
    const output: string =
        `${ts}${prefix[type]} ${message}`

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


function formatTs() {
    throw new Error("Function not implemented.")
}
// @TODO: make this a package