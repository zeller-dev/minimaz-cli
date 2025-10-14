import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { log } from '../utils/logService.js'
import { createGlobalDir } from '../utils/functions.js'

export async function init(projectName, options = {}) {
  const minimazDir = path.join(os.homedir(), '.minimaz')
  
  if (!await fs.pathExists(minimazDir)) {
    log('info', `Global folder '${minimazDir}' not found. Creating...`)
    await createGlobalDir()
  }

  const templateDir = path.join(minimazDir, 'templates', options.template)
  const targetDir = path.resolve(process.cwd(), projectName)

  if (!await fs.pathExists(templateDir)) throw new Error(`Template '${options.template}' not found.`)

  try {
    await fs.copy(templateDir, targetDir)

    // Copia anche gitignore se presente
    const gitignoreSrc = path.join(templateDir, '..', 'gitignore')
    const gitignoreDest = path.join(targetDir, '.gitignore')

    if (await fs.pathExists(gitignoreSrc)) {
      await fs.copy(gitignoreSrc, gitignoreDest)
      log('info', `Added .gitignore to project.`)
    }

    log('success', `Project '${projectName}' created using template '${options.template}'.`)
  } catch (e) {
    throw new Error(`Failed to create project: ${e.message}`)
  }
}
