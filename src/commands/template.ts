import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { log } from '../utils/logService.js'
import { askQuestion, listTemplates, getGlobalNodeModulesPath } from '../utils/functions.js'

interface TemplateOptions {
  list?: boolean
  l?: boolean
  delete?: string
  d?: string
  update?: string
  u?: string
}

/**
 * Gestisce i template: salvataggio, aggiornamento e cancellazione
 */
export async function template(targetPath?: string, options: TemplateOptions = {}): Promise<void> {
  const templatesDir = path.join(os.homedir(), '.minimaz', 'templates')
  const deleteName = options.delete || options.d
  const updateName = options.update || options.u

  if (deleteName) return await deleteTemplate(templatesDir, deleteName)
  if (options.list || options.l) return await listTemplates(templatesDir)

  // --- UPDATE MODE ---
  if (updateName !== undefined) {
    if (typeof updateName === 'string' && updateName.trim()) {
      return await updateSingleTemplate(templatesDir, updateName.trim())
    } else {
      return await updateFromNodeModules(templatesDir)
    }
  }

  await saveTemplate(templatesDir, targetPath)
}

/** Aggiorna un singolo template dalla cartella corrente */
async function updateSingleTemplate(templatesDir: string, templateName: string): Promise<void> {
  const sourceDir = path.resolve(process.cwd())
  const targetDir = path.join(templatesDir, templateName)

  if (!await fs.pathExists(targetDir))
    throw new Error(`Template '${templateName}' not found in ~/.minimaz/templates`)

  const confirm = await askQuestion(`❓ Update template '${templateName}' with current directory? (Y/N) `)
  if (confirm.toLowerCase() !== 'y') {
    log('info', 'Update cancelled.')
    return
  }

  try {
    await fs.copy(sourceDir, targetDir, { overwrite: true })
    log('success', `Template '${templateName}' updated from current directory.`)
  } catch (e: any) {
    throw new Error(`Failed to update '${templateName}': ${e.message}`)
  }
}

/** Aggiorna tutti i template e file da node_modules/minimaz/src/templates */
async function updateFromNodeModules(templatesDir: string): Promise<void> {
  const nodeModulesPath = path.join(getGlobalNodeModulesPath(), 'minimaz', 'src', 'templates')

  if (!await fs.pathExists(nodeModulesPath))
    throw new Error(`'node_modules/minimaz/src/templates' not found.`)

  const items = await fs.readdir(nodeModulesPath)

  const answer = await askQuestion(`⚠️ Update local templates and files from node_modules? (Y/N): `)
  if (answer !== 'y' && answer !== '') {
    log('info', 'Update cancelled.')
    return
  }

  try {
    for (const item of items) {
      const src = path.join(nodeModulesPath, item)
      const dest = path.join(templatesDir, item)
      await fs.copy(src, dest, { overwrite: true })
      log('success', `Updated '${item}'`)
    }
    log('info', `✨ All templates and files updated successfully.`)
  } catch (e: any) {
    throw new Error(`Update failed: ${e.message}`)
  }
}

/** Cancella un template globale */
async function deleteTemplate(dir: string, name: string): Promise<void> {
  if (!name) throw new Error('No template name specified to delete.')
  const target = path.join(dir, name)
  if (!await fs.pathExists(target)) throw new Error(`Template not found: ${name}`)

  const confirm = await askQuestion(`❓ Confirm delete '${name}'? (Y/N) `)
  if (confirm.toLowerCase() !== 'y') {
    log('info', 'Delete cancelled.')
    return
  }

  try {
    await fs.remove(target)
    log('success', `Template '${name}' deleted.`)
  } catch (e: any) {
    throw new Error(`Delete error: ${e.message}`)
  }
}

/** Salva la cartella corrente o specificata come nuovo template globale */
async function saveTemplate(dir: string, targetPath?: string): Promise<void> {
  let source = targetPath ? path.resolve(process.cwd(), targetPath) : process.cwd()

  if (!await fs.pathExists(source)) {
    log('warn', `Path not found: ${source}`)
    const answer = (await askQuestion('❓ Use current directory instead? (Y/N) ')).trim().toLowerCase()
    if (answer !== 'y' && answer !== '') throw new Error('Operation cancelled.')
    source = process.cwd()
  }

  try {
    await fs.ensureDir(dir)
    const dest = path.join(dir, path.basename(source))
    await fs.copy(source, dest)
    log('success', `Template saved to ${dest}`)
  } catch (e: any) {
    throw new Error(`Failed to save template: ${e.message}`)
  }
}
