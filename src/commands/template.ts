import fs from 'fs-extra'
import path from 'path'

import {
  askQuestion, listTemplates, getGlobalNodeModulesPath, log,
  getGlobalDirPath
} from '../index.js'

/**
 * Handles all template-related operations:
 * - Save current folder as a global template
 * - Update existing templates
 * - Delete templates
 * - Sync templates from node_modules
 *
 * @param targetPath - Optional path of the folder to save as template
 * @param options - CLI flags (--list, --delete, --update, etc.)
 */
export async function template(targetPath?: string, options: any = {}): Promise<void> {
  const templatesDir: string = path.join(getGlobalDirPath(), 'templates')
  const deleteName: string | undefined = options.delete || options.d
  const updateName: string | undefined = options.update || options.u

  if (deleteName) return await deleteTemplate(templatesDir, deleteName)
  if (options.list || options.l) return await listTemplates()

  // --- UPDATE MODE ---
  if (updateName !== undefined) {
    if (typeof updateName === 'string' && updateName.trim()) {
      return await updateSingleTemplate(templatesDir, updateName.trim())
    } else {
      return await updateFromNodeModules(templatesDir)
    }
  }

  // Default action: save current folder as a template
  await saveTemplate(templatesDir, targetPath)
}

/**
 * Updates a single template with files from the current working directory.
 *
 * @param templatesDir - Global templates directory (~/.minimaz/templates)
 * @param templateName - Name of the template to update
 */
async function updateSingleTemplate(templatesDir: string, templateName: string): Promise<void> {
  const sourceDir: string = path.resolve(process.cwd())
  const targetDir: string = path.join(templatesDir, templateName)

  if (!await fs.pathExists(targetDir))
    throw new Error(`Template '${templateName}' not found in ~/.minimaz/templates`)

  if (
    !(await askQuestion(`Update template '${templateName}' with current directory? [y/n]:`, 'y')).startsWith('y')
  ) {
    log('info', 'Update cancelled.')
    return
  }

  try {
    await fs.copy(sourceDir, targetDir, { overwrite: true })
    log('success', `Template '${templateName}' updated from current directory.`)
  } catch (error: any) {
    throw new Error(`Failed to update '${templateName}'`)
  }
}

/**
 * Updates all templates from the global node_modules/minimaz/src/templates folder.
 * This ensures the local templates are synced with the installed package.
 *
 * @param templatesDir - Global templates directory (~/.minimaz/templates)
 */
async function updateFromNodeModules(templatesDir: string): Promise<void> {
  const nodeModulesPath: string = path.join(getGlobalNodeModulesPath(), 'src', 'templates')

  if (!await fs.pathExists(nodeModulesPath)) throw new Error(`'node_modules/minimaz/src/templates' not found.`)

  const items: string[] = await fs.readdir(nodeModulesPath)

  if (
    !((await askQuestion('Update local templates overwriting them with defaults? [y/n]:', 'y')).startsWith('y'))
  ) {
    log('info', 'Update cancelled.')
    return
  }

  try {
    for (const item of items) {
      const src: string = path.join(nodeModulesPath, item)
      const dest: string = path.join(templatesDir, item)
      await fs.copy(src, dest, { overwrite: true })
      log('success', `Updated '${item}'`)
    }
    log('info', `✨ All templates and files updated successfully.`)
  } catch (error: any) {
    throw new Error(`Update failed: ${error.message}`)
  }
}

/**
 * Deletes a global template by name from ~/.minimaz/templates.
 *
 * @param dir - Global templates directory
 * @param name - Template name to delete
 */
async function deleteTemplate(dir: string, name: string): Promise<void> {
  if (!name) throw new Error('No template name specified to delete.')
  const target: string = path.join(dir, name)
  if (!await fs.pathExists(target)) throw new Error(`Template not found: ${name}`)

  if (
    !(await askQuestion(`Confirm delete '${name}'? [y/n]:`, 'y')).startsWith('y')
  ) {
    log('info', 'Delete cancelled.')
    return
  }

  try {
    await fs.remove(target)
    log('success', `Template '${name}' deleted.`)
  } catch (error: any) {
    throw new Error(`Delete error: ${error.message}`)
  }
}

/**
 * Saves a folder (current or specified) as a new global template.
 *
 * @param dir - Global templates directory (~/.minimaz/templates)
 * @param targetPath - Optional path to save as a template
 */
async function saveTemplate(dir: string, targetPath?: string): Promise<void> {
  let source: string = targetPath
    ? path.resolve(process.cwd(), targetPath)
    : process.cwd()

  if (!await fs.pathExists(source)) {
    log('warn', `Path not found: ${source}`)
    if (
      (await askQuestion(
        'Use current directory instead? [y/n]:', 'y'
      )).startsWith('y')
    ) {
      source = process.cwd()
    } else {
      throw new Error('Operation cancelled.')
    }
  }

  try {
    await fs.ensureDir(dir)
    const dest: string = path.join(dir, path.basename(source))
    if (await fs.pathExists(dest)) {
      const proceed: boolean = (await askQuestion(
        `Template '${path.basename(dest)}' already exists. Overwrite? [y/n]:`,
        'n'
      )).startsWith('y')

      if (!proceed) {
        log('info', 'Save cancelled.')
        return
      }
    }
    await fs.copy(source, dest, { overwrite: true })
    log('success', `Template saved to ${dest}`)
  } catch (error: any) {
    throw new Error(`Failed to save template: ${error.message}`)
  }
}
