import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { log } from '../utils/logService.js'

export async function init(projectName, options = {}) {
  const templateDir = path.join(os.homedir(), '.minimaz', 'templates', options.template)
  const targetDir = path.resolve(process.cwd(), projectName)

  if (!await fs.pathExists(templateDir)) throw new Error(`Template '${options.template}' not found.`)

  try {
    await fs.copy(templateDir, targetDir)
    log('success', `Project '${projectName}' created using template '${options.template}'.`)
  } catch (e) {
    throw new Error(`Failed to create project: ${e.message}`)
  }
}
