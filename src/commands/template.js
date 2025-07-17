import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { log } from '../utils/logService.js'
import { askQuestion, listTemplates } from '../utils/functions.js'

export async function template(targetPath, options = {}) {
  const templatesDir = path.join(os.homedir(), '.minimaz', 'templates')
  const deleteName = options.delete || options.d
  const list = options.list || options.l

  if (deleteName) return await deleteTemplate(templatesDir, deleteName)
  if (list) return await listTemplates(templatesDir)
  await saveTemplate(templatesDir, targetPath)
}

async function deleteTemplate(dir, name) {
  if (!name) {
    log('error', 'No template name specified to delete.')
    process.exit(1)
  }

  const target = path.join(dir, name)
  if (!await fs.pathExists(target)) {
    log('warn', `Template not found: ${name}`)
    process.exit(1)
  }

  const confirm = await askQuestion(`❓ Confirm delete '${name}'? (Y/N) `)
  if (confirm.toLowerCase() !== 'y') {
    log('info', 'Delete cancelled.')
    return
  }

  try {
    await fs.remove(target)
    log('success', `Template '${name}' deleted.`)
  } catch (e) {
    log('error', `Delete error: ${e.message}`)
    process.exit(1)
  }
}

async function saveTemplate(dir, targetPath) {
  let source = targetPath
    ? path.resolve(process.cwd(), targetPath)
    : process.cwd()

  if (!await fs.pathExists(source)) {
    log('warn', `Path not found: ${source}`)
    const answer = await askQuestion('❓ Use current directory instead? (Y/N) ')
    if (answer.toLowerCase() !== 'y') {
      log('error', 'Operation cancelled.')
      process.exit(1)
    }
    source = process.cwd()
  }

  try {
    await fs.ensureDir(dir)
    const dest = path.join(dir, path.basename(source))
    await fs.copy(source, dest)
    log('success', `Template saved to ${dest}`)
  } catch (e) {
    log('error', `Copy error: ${e.message}`)
    process.exit(1)
  }
}