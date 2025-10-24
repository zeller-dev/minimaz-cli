import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { log } from '../utils/logService.js'
import { createGlobalDir } from '../utils/functions.js'

/**
 * Initializes a new Minimaz project by copying a predefined template
 * from the user's global Minimaz directory (~/.minimaz/templates).
 *
 * @param projectName - The name of the project folder to create.
 * @param options - Optional settings (e.g. { template: 'landing' }).
 *
 * Process:
 * 1. Ensures the global `.minimaz` directory exists.
 * 2. Locates the chosen template inside `.minimaz/templates`.
 * 3. Copies the template files to the new project folder.
 * 4. Adds `.gitignore` if available.
 * 5. Logs actions and errors.
 */
export async function init(projectName: string, options: any = {}): Promise<void> {
  const minimazDir: string = path.join(os.homedir(), '.minimaz')

  // Step 1: Create global folder if missing
  if (!await fs.pathExists(minimazDir)) {
    log('info', `Global folder '${minimazDir}' not found. Creating...`)
    await createGlobalDir()
  }

  // Step 2: Determine paths
  const templateDir: string = path.join(minimazDir, 'templates', options.template || 'default')
  const targetDir: string = path.resolve(process.cwd(), projectName)

  // Step 3: Validate template existence
  if (!await fs.pathExists(templateDir))
    throw new Error(`Template '${options.template}' not found.`)

  try {
    // Step 4: Copy template files to target directory
    await fs.copy(templateDir, targetDir)

    // Step 5: Copy .gitignore if available at the parent level
    const gitignoreSrc: string = path.join(templateDir, '..', 'gitignore')
    const gitignoreDest: string = path.join(targetDir, '.gitignore')
    if (await fs.pathExists(gitignoreSrc)) {
      await fs.copy(gitignoreSrc, gitignoreDest)
      log('info', `.gitignore added to project.`)
    }

    // Step 6: Confirm success
    log('success', `Project '${projectName}' created using template '${options.template}'.`)
  } catch (error: any) {
    // Step 7: Handle any failure during copy
    throw new Error(`Failed to create project: ${error.message}`)
  }
}