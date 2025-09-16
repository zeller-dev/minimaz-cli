import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { log } from './logService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function setupDefaultTemplates() {
  const globalDir = path.join(os.homedir(), '.minimaz', 'templates')
  const defaultDir = path.resolve(__dirname, '..', 'templates')

  try {
    const exists = await fs.pathExists(globalDir)
    const isEmpty = exists ? (await fs.readdir(globalDir)).length === 0 : true

    if (!exists) {
      await fs.ensureDir(globalDir)
      log('success', 'Created global templates directory.')
    }

    if (!isEmpty) {
      log('info', 'Global templates directory not empty. Skipping copy.')
      return
    }

    for (const name of await fs.readdir(defaultDir)) {
      await fs.copy(path.join(defaultDir, name), path.join(globalDir, name))
      log('success', `Copied template '${name}'.`)
    }

    log('success', 'Default templates setup completed.')

  } catch (e) { log('error', `Setup error: ${e.message}`) }
}

setupDefaultTemplates()