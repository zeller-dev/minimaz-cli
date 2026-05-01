import {
    colors,

    LogType
} from "./index.js"



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
 * Colorises text
 */
export function colorize(
    text: string,
    color: string
): string {
    return `${color}${text}${colors.reset}`
}


/**
 * Formats the current date as YYYY-MM-DD hh:mm:ss
 */
function formatTs(date: Date = new Date()): string {
    const pad = (n: number) => n.toString().padStart(2, "0")
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const h = pad(date.getHours())
    const min = pad(date.getMinutes())
    const s = pad(date.getSeconds())
    return `${y}-${m}-${d} ${h}:${min}:${s}`
}
