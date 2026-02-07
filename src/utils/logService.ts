import { LogType } from "../index.js"

// ----- Log Function -----
// Prints a message to console with icon based on type
export function log(type: LogType = 'info', message: string): void {

  const icons: Record<LogType, string> = {
    error: '❌',    // error icon
    warn: '⚠️',     // warning icon
    success: '✅',  // success icon
    info: 'ℹ️'      // default icon
  }

  switch (type) {
    case 'error':
      console.error(icons[type], '\t', message)
      break
    case 'warn':
      console.warn(icons[type], '\t', message)
      break
    default:
      console.log(icons[type], '\t', message)
      break
  }
}