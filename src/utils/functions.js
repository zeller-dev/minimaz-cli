import readline from 'readline'
import fs from 'fs-extra'
import path from 'path'
import { log } from './logService.js'

export function parseArgs(rawArgs) {
  const args = { _: [] }
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i]
    if (arg.startsWith('-')) {
      const key = arg.startsWith('--') ? arg.slice(2) : arg.slice(1)
      const next = rawArgs[i + 1]
      const hasValue = next && !next.startsWith('-')
      args[key] = hasValue ? next : true
      if (hasValue) i++
    } else { args._.push(arg) }
  }
  return args
}

export function askQuestion(query) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(query, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

export async function listTemplates(dir) {
  if (!await fs.pathExists(dir)) {
    log('info', 'No global templates found.')
    return
  }
  const templates = await fs.readdir(dir)
  if (templates.length === 0) log('info', 'No global templates available.') 
  else {
    log('info', 'Available global templates:')
    templates.forEach(t => log('info', `- ${t}`))
  }
}

export function applyReplacements(content, replacements = {}) {
  for (const [from, to] of Object.entries(replacements)) {
    content = content.split(from).join(to)
  }
  return content
}

export async function getFile(srcPath, replace) {
  try {
    let file = await fs.readFile(srcPath, 'utf-8')
    file = applyReplacements(file, replace)
    return file
  } catch (err) {
    log('error', `Failed to read file ${srcPath}: ${err.message}`)
    return null
  }
}

export function getGlobalNodeModulesPath() {
  return process.platform === 'win32'
    ? path.join(process.env.APPDATA, 'npm', 'node_modules')
    : '/usr/local/lib/node_modules'
}

export async function createGlobalDir() {
  const globalDir = path.join(os.homedir(), '.minimaz', 'templates')
  const defaultDir = path.resolve(__dirname, '..', 'templates')

  try {
    const exists = await fs.pathExists(globalDir)
    const isEmpty = exists ? (await fs.readdir(globalDir)).length === 0 : true

    if (!exists) {
      await fs.ensureDir(globalDir)
      log('success', 'Created global templates directory.')
    }

    if (!isEmpty) {
      log('info', 'Global templates directory not empty. Skipping copy.')
      return
    }

    for (const name of await fs.readdir(defaultDir)) {
      await fs.copy(path.join(defaultDir, name), path.join(globalDir, name))
      log('success', `Copied template '${name}'.`)
    }

    log('success', 'Default templates setup completed.')
  } catch (e) {
    log('error', `Failed to create global templates directory: ${e.message}`)
    throw e
  }
}