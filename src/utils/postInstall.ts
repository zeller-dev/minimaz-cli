import {
  createGlobalDir, log  // utils
} from '../index.js'

// ----- Setup Default Templates -----
// Runs after install to ensure global templates exist
export async function postInstall(): Promise<void> {
  try {
    log('info', 'Running Post Install...')
    await createGlobalDir()
    log('success', 'Postinstall: Global templates setup completed')
  } catch (error: any) {
    log('error', `Postinstall setup failed: ${error.message}`)
  }
}