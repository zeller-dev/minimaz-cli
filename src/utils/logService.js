export function log(type = '', message) {
    const icons = {
        error: '❌',
        warning: '⚠️',
        success: '✅',
        info: 'ℹ️',
        default: '📁'
    }
    const icon = icons[type] || icons.default
    const method = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log'
    console[method](icon, message)
}