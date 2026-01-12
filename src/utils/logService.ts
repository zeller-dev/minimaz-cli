import { LogType } from "../index.js"

// ----- Log Function -----
// Prints a message to console with icon based on type
export function log(type: LogType = 'log', message: string): void {
  const icons: Record<LogType, string> = {
    error: '❌',
    warn: '⚠️',
    success: '✅',
    info: 'ℹ️',
    log: '📁' // default icon
  }

  switch (type) {
    case 'error':
      console.error(icons[type], '\t', message)
      break
    case 'warn':
      console.warn(icons[type], '\t', message)
      break
    default:
      console.log(icons[type] || icons.log, '\t', message)
      break
  }
}