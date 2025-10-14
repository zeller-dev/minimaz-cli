type LogType = 'error' | 'warn' | 'success' | 'info' | 'log'

export function log(type: LogType = 'log', message: string): void {
  const icons: Record<LogType, string> = {
    error: '❌',
    warn: '⚠️',
    success: '✅',
    info: 'ℹ️',
    log: '📁' // default icon
  }

  // Usa console.error o console.warn solo per error e warn
  if (type === 'error') console.error(icons[type], message)
  else if (type === 'warn') console.warn(icons[type], message)
  else console.log(icons[type] || icons.log, message)
}
