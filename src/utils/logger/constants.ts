/**
 * ANSI escape codes used for terminal log styling.
 *
 * These values are applied to format CLI output with colors.
 * Compatible with most Unix terminals and modern Windows terminals.
 *
 * Note: Always reset formatting after applying a color to avoid bleed.
 */
export const colors: Record<string, string> = {
    reset: "\x1b[0m",   // Resets all styles
    red: "\x1b[31m",    // Errors / critical messages
    yellow: "\x1b[33m", // Warnings
    green: "\x1b[32m",  // Success messages
    blue: "\x1b[34m",   // Informational logs
    gray: "\x1b[90m"    // Secondary / debug output
}