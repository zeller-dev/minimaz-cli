export function log(type = 'log', message) {
    const icons = {
        error: '❌',
        warn: '⚠️ ',
        success: '✅',
        info: 'ℹ️ ',
        default: '📁'
    }

    console[(type === 'error' && type === 'warn') ? type : 'log'](
        icons[type] || icons.default,
        message
    )
}