import { createGlobalDir } from './functions.js'
import { log } from './logService.js'

// ----- Setup Default Templates -----
// Runs after install to ensure global templates exist
async function setupDefaultTemplates(): Promise<void> {
  try {
    await createGlobalDir()
    log('success', 'Postinstall: Global templates setup completed.')
  } catch (error: any) {
    log('error', `Postinstall setup failed: ${error.message}`)
  }
}

// Execute setup
setupDefaultTemplates()