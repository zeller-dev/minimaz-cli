import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { log } from '../utils/logService.js'
import { askQuestion, listTemplates } from '../utils/functions.js'

export async function template(targetPath, options = {}) {
  const templatesDir = path.join(os.homedir(), '.minimaz', 'templates')
  const deleteName = options.delete || options.d

  if (deleteName) return await deleteTemplate(templatesDir, deleteName)
  if (options.list || options.l) return await listTemplates(templatesDir)
  await saveTemplate(templatesDir, targetPath)
}

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

async function saveTemplate(dir, targetPath) {
  let source = targetPath
    ? path.resolve(process.cwd(), targetPath)
    : process.cwd()

  if (!await fs.pathExists(source)) {
    log('warn', `Path not found: ${source}`)
    const answer = await askQuestion('❓ Use current directory instead? (Y/N) ')
    if (answer.toLowerCase() !== 'y') throw new Error('Operation cancelled.')
    source = process.cwd()
  }

  try {
    await fs.ensureDir(dir)
    const dest = path.join(dir, path.basename(source))
    await fs.copy(source, dest)
    log('success', `Template saved to ${dest}`)
  } catch (e) {
    throw new Error(`Failed to create project: ${e.message}`)
  }
}