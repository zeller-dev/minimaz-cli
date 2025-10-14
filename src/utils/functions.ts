import readline from 'readline'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { log } from './logService.js'

// ----- Types -----
interface Args {
  _: string[]
  [key: string]: string | boolean | string[]
}

// ----- Parse CLI Arguments -----
export function parseArgs(rawArgs: string[]): Args {
  const args: Args = { _: [] }
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i]
    if (arg.startsWith('-')) {
      const key = arg.startsWith('--') ? arg.slice(2) : arg.slice(1)
      const next = rawArgs[i + 1]
      const hasValue = next && !next.startsWith('-')
      args[key] = hasValue ? next : true
      if (hasValue) i++
    } else {
      args._.push(arg)
    }
  }
  return args
}

// ----- Ask Question from CLI -----
export function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(query, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

// ----- List Templates -----
export async function listTemplates(dir: string): Promise<void> {
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

// ----- Apply Replacements in File Content -----
export function applyReplacements(content: string, replacements: Record<string, string> = {}): string {
  for (const [from, to] of Object.entries(replacements)) {
    content = content.split(from).join(to)
  }
  return content
}

// ----- Read File with Replacements -----
export async function getFile(srcPath: string, replace?: Record<string, string>): Promise<string | null> {
  try {
    let file = await fs.readFile(srcPath, 'utf-8')
    if (replace) file = applyReplacements(file, replace)
    return file
  } catch (err: any) {
    log('error', `Failed to read file ${srcPath}: ${err.message}`)
    return null
  }
}

// ----- Global Node Modules Path -----
export function getGlobalNodeModulesPath(): string {
  return process.platform === 'win32'
    ? path.join(process.env.APPDATA || '', 'npm', 'node_modules')
    : '/usr/local/lib/node_modules'
}

// ----- Create Global Templates Folder -----
export async function createGlobalDir(): Promise<void> {
  const globalDir = path.join(os.homedir(), '.minimaz', 'templates')
  const defaultDir = path.resolve(new URL('.', import.meta.url).pathname, '..', 'templates')

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
  } catch (e: any) {
    log('error', `Failed to create global templates directory: ${e.message}`)
    throw e
  }
}