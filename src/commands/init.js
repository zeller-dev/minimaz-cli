import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { log } from '../utils/logService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Initialize a new project by copying template files
 * @param {string} projectName - Name of the new project folder
 */
export async function init(projectName, options = {}) {
    try {
        const template = options.template || 'default'
        const targetDir = path.resolve(process.cwd(), projectName)
        const templateDir = path.resolve(__dirname, '..', 'templates', template)

        if (!await fs.pathExists(templateDir)) {
            log('', 'error', `❌ Template "${template}" not found.`)
            process.exit(1)
        }

        await fs.copy(templateDir, targetDir)
        log('', 'success', `Project '${projectName}' created successfully.`)

    } catch (err) { log('', 'error', `❌ Error while creating project:${err}`) }
}
