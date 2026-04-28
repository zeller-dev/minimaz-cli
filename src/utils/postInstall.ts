import {
    // COMMANDS
    config,

    // --- FUNCTIONS
    log
} from '../index.js'

// ----- Setup Default Templates -----
// Runs after install to ensure global templates exist
export async function postInstall(): Promise<void> {
    try {
        log('info', 'Running Post Install...')
        await config(false)
        log('success', 'Postinstall: Global templates setup completed')
    } catch (error: any) {
        log('error', `Postinstall setup failed: ${error.message}`)
    }
}