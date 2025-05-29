export function log(icon = '🚀', type = '', message) {
    switch (type) {
        case 'error':
            icon = '❌'
            console.error(icon, message)
            break
        case 'warning':
            icon = '⚠️'
            console.warn(icon, message)
            break
        case 'success':
            icon = '✅'
            console.log(icon, message)
            break
        default:
            console.log(icon, message)
            break
    }
}