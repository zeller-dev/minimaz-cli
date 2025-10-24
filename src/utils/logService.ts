// ----- Log Types -----
type LogType = 'error' | 'warn' | 'success' | 'info' | 'log'

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

  // Use console.error/console.warn only for error and warn
  if (type === 'error') console.error(icons[type], message)
  else if (type === 'warn') console.warn(icons[type], message)
  else console.log(icons[type] || icons.log, message)
}