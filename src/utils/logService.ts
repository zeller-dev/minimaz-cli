import {
  LogType   //types
} from "../index.js"

/**
 * Formats the current date as YYYY-MM-DD hh:mm:ss
 */
function formatTs(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const y: number = date.getFullYear()
  const m: string = pad(date.getMonth() + 1)
  const d: string = pad(date.getDate())
  const h: string = pad(date.getHours())
  const min: string = pad(date.getMinutes())
  const s: string = pad(date.getSeconds())
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

/**
 * Prints a message to console with icon based on type.
 * Honors VERBOSE environment variable for 'info' messages.
 */
export function log(type: LogType = 'info', message: string): void {
  const prefix: Record<LogType, string> = {
    error: '[ ERROR ]',
    warn: '[ WARN  ]',
    success: '[ SUCCESS ]',
    info: '[ INFO  ]',
    debug: '[ DEBUG ]'
  }

  // Only print 'info' if VERBOSE is true, others always print
  if (type === 'debug' && process.env.VERBOSE !== 'true') return

  const output = `[${formatTs()}] ${prefix[type]} ${message}`

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