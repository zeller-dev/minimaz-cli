import {
  colors,   // constants
  LogType   // types
} from "../index.js"

/**
 * Prints a message to console with prefix based on type.
 * Timestamp is shown only when VERBOSE=true.
 */
export function log(type: LogType = 'info', message: string): void {
  const prefix: Record<LogType, string> = {
    error: colorize('[ --- ERROR ----- ]\t', colors.red),
    warn: colorize('[ --- WARN ------ ]\t', colors.yellow),
    success: colorize('[ --- SUCCESS --- ]\t', colors.green),
    info: colorize('[ --- INFO ------ ]\t', colors.blue),
    debug: colorize('[ --- DEBUG ----- ]\t', colors.gray)
  }

  const isVerbose: boolean = process.env.VERBOSE === 'true'

  // Only print debug messages in verbose mode
  if (type === 'debug' && !isVerbose) return

  const ts = isVerbose
    ? colorize(`[${formatTs()}] `, colors.gray)
    : ''
  const output: string = `${ts}${prefix[type]} ${message}`

  switch (type) {
    case 'error':
      console.error(output)
      break
    case 'warn':
      console.warn(output)
      break
    default:
      console.log(output)
      break
  }
}

/**
 * Colorises text
 */
function colorize(text: string, color: string): string {
  return `${color}${text}${colors.reset}`
}

/**
 * Formats the current date as YYYY-MM-DD hh:mm:ss
 */
function formatTs(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const min = pad(date.getMinutes())
  const s = pad(date.getSeconds())
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}