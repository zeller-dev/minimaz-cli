import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { spawn } from 'child_process'
import { log } from '../utils/logService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Initialize a new project by copying template files
 * @param {string} projectName - Name of the new project folder
 * @param {Object} options - Options including the template name
 */
export async function init(projectName, options = {}) {
  try {
    const targetDir = path.resolve(process.cwd(), projectName)
    const templateDir = path.resolve(__dirname, '..', 'templates', options.template)

    if (!await fs.pathExists(templateDir)) {
      log('', 'error', `❌ Template "${template}" not found.`)
      process.exit(1)
    }

    await fs.copy(templateDir, targetDir)

    switch (template) {
      case 'node-ready': {
        log('📦', 'info', 'Running npm init...')
        const proc = spawn('npm', ['init'], { cwd: targetDir, stdio: 'inherit', shell: true })
        proc.on('error', err => log('❌', 'error', `Failed to run npm init: ${err.message}`))
        break
      }
      default:
        break
    }

    log('', 'success', `🎉 Project '${projectName}' created successfully.`)
  } catch (e) {
    log('', 'error', `❌ Error while creating project: ${e.message}`)
    process.exit(1)
  }
}
