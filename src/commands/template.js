import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { log } from '../utils/logService.js'
import { askQuestion, listTemplates, getGlobalNodeModulesPath } from '../utils/functions.js'

export async function template(targetPath, options = {}) {
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

// 1️⃣ Aggiorna un singolo template da cartella corrente
async function updateSingleTemplate(templatesDir, templateName) {
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
  } catch (e) {
    throw new Error(`Failed to update '${templateName}': ${e.message}`)
  }
}

// 2️⃣ Aggiorna tutti i template (e file) da node_modules/minimaz/src/templates
async function updateFromNodeModules(templatesDir) {
  const nodeModulesPath = path.join(getGlobalNodeModulesPath(), 'minimaz', 'src', 'templates')

  if (!await fs.pathExists(nodeModulesPath))
    throw new Error(`'node_modules/minimaz/src/templates' not found.`)

  // 🔍 Legge tutto (file e cartelle)
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

      // Copia sia cartelle che file singoli
      await fs.copy(src, dest, { overwrite: true })
      log('success', `Updated '${item}'`)
    }

    log('info', `✨ All templates and files updated successfully.`)
  } catch (e) {
    throw new Error(`Update failed: ${e.message}`)
  }
}

// Cancella un template
async function deleteTemplate(dir, name) {
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
  } catch (e) {
    throw new Error(`Delete error: ${e.message}`)
  }
}

// Salva un nuovo template
async function saveTemplate(dir, targetPath) {
  let source = targetPath
    ? path.resolve(process.cwd(), targetPath)
    : process.cwd()

  if (!await fs.pathExists(source)) {
    log('warn', `Path not found: ${source}`)
    const answer = await askQuestion('❓ Use current directory instead? (Y/N) ').trim().toLowerCase()
    if (answer !== 'y' && answer !== '') throw new Error('Operation cancelled.')
    source = process.cwd()
  }

  try {
    await fs.ensureDir(dir)
    const dest = path.join(dir, path.basename(source))
    await fs.copy(source, dest)
    log('success', `Template saved to ${dest}`)
  } catch (e) {
    throw new Error(`Failed to save template: ${e.message}`)
  }
}