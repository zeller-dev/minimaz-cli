import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { log } from '../utils/logService.js'
import { createGlobalDir } from '../utils/functions.js'

interface InitOptions {
  template?: string
}

/**
 * Crea un nuovo progetto usando un template globale.
 * @param projectName Nome della cartella del progetto
 * @param options Opzioni (template da usare)
 */
export async function init(projectName: string, options: InitOptions = {}): Promise<void> {
  const minimazDir = path.join(os.homedir(), '.minimaz')
  
  // Se la cartella globale non esiste, la crea
  if (!await fs.pathExists(minimazDir)) {
    log('info', `Global folder '${minimazDir}' not found. Creating...`)
    await createGlobalDir()
  }

  const templateDir = path.join(minimazDir, 'templates', options.template || 'default')
  const targetDir = path.resolve(process.cwd(), projectName)

  if (!await fs.pathExists(templateDir)) throw new Error(`Template '${options.template}' not found.`)

  try {
    // Copia tutto il contenuto del template nella cartella progetto
    await fs.copy(templateDir, targetDir)

    // Copia anche il gitignore se presente
    const gitignoreSrc = path.join(templateDir, '..', 'gitignore')
    const gitignoreDest = path.join(targetDir, '.gitignore')
    if (await fs.pathExists(gitignoreSrc)) {
      await fs.copy(gitignoreSrc, gitignoreDest)
      log('info', `Added .gitignore to project.`)
    }

    log('success', `Project '${projectName}' created using template '${options.template}'.`)
  } catch (e: any) {
    throw new Error(`Failed to create project: ${e.message}`)
  }
}
