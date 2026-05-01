import {
    // --- CONSTANTS ---
    colors,

    // --- TYPES ---
    LogType
} from "./index.js"

/**
 * Preformatted log prefixes per log level.
 *
 * Each prefix is colorized once at definition time to avoid
 * repeated formatting during logging.
 */
export const prefix: Record<LogType, string> = {
    error:
        colorize("[ --- ERROR ----- ]\t", colors.red),
    warn:
        colorize("[ --- WARN ------ ]\t", colors.yellow),
    success:
        colorize("[ --- SUCCESS --- ]\t", colors.green),
    info:
        colorize("[ --- INFO ------ ]\t", colors.blue),
    debug:
        colorize("[ --- DEBUG ----- ]\t", colors.gray)
}

/**
 * Wraps a string with ANSI color codes.
 *
 * Always appends a reset code to prevent style bleed
 * into subsequent terminal output.
 *
 * @param {string} text - Text to format
 * @param {string} color - ANSI color code
 * @returns {string}
 */
export function colorize(
    text: string,
    color: string
): string {
    return `${color}${text}${colors.reset}`
}

/**
 * Formats a Date into a consistent timestamp string.
 *
 * Format: YYYY-MM-DD HH:mm:ss (24-hour, zero-padded)
 *
 * @param {Date} [date=new Date()] - Date instance to format
 * @returns {string}
 */
export function formatTs(date: Date = new Date()): string {
    // Ensures all date/time components are two digits
    const pad = (n: number) => n.toString().padStart(2, "0")

    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1) // Months are zero-based
    const d = pad(date.getDate())
    const h = pad(date.getHours())
    const min = pad(date.getMinutes())
    const s = pad(date.getSeconds())

    return `${y}-${m}-${d} ${h}:${min}:${s}`
}