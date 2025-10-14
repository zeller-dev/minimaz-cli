import { createGlobalDir } from './functions.js'
import { log } from './logService.js'

async function setupDefaultTemplates(): Promise<void> {
  try {
    await createGlobalDir()
    log('success', 'Postinstall: Global templates setup completed.')
  } catch (e: any) {
    log('error', `Postinstall setup failed: ${e.message}`)
  }
}

setupDefaultTemplates()
