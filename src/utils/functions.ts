import readline from 'readline'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { log } from './logService.js'
import { execSync } from 'child_process'

// ----- Types -----
interface Args {
  _: string[]
  [key: string]: string | boolean | string[]
}

// ----- Parse CLI Arguments -----
// Converts raw process arguments into structured key-value pairs
export function parseArgs(rawArgs: string[]): Args {
  const args: Args = { _: [] }
  for (let i = 0; i < rawArgs.length; i++) {
    const arg: string = rawArgs[i]
    if (arg.startsWith('-')) {
      const key: string = arg.startsWith('--') ? arg.slice(2) : arg.slice(1)
      const next: string = rawArgs[i + 1]
      const hasValue: boolean = !!next && !next.startsWith('-')
      args[key] = hasValue ? next : true
      if (hasValue) i++
    } else {
      args._.push(arg)
    }
  }
  return args
}

// ----- Ask Question from CLI -----
// Prompts the user with a question and returns the input
export function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => {
    const rl: readline.Interface = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    rl.question(query, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

// ----- List Templates -----
// Displays all available global templates in the given directory
export async function listTemplates(dir: string): Promise<void> {
  if (!await fs.pathExists(dir)) {
    log('info', 'No templates directory found.')
    return
  }

  const templates: string[] = await fs.readdir(dir)
  if (templates.length === 0) log('info', 'No global templates available.')
  else {
    log('info', 'Available global templates:')
    templates.forEach(t => log('info', `- ${t}`))
  }
}

// ----- Apply Replacements -----
// Replaces all occurrences of keys in content with their corresponding values
export function applyReplacements(content: string, replacements: Record<string, string> = {}): string {
  for (const [from, to] of Object.entries(replacements)) {
    content = content.split(from).join(to)
  }
  return content
}

// ----- Read File with Replacements -----
// Reads a file and applies string replacements if provided
export async function getFile(srcPath: string, replace?: Record<string, string>): Promise<string> {
  try {
    let file: string = await fs.readFile(srcPath, 'utf-8')
    if (replace) file = applyReplacements(file, replace)
    return file
  } catch (error: any) {
    log('error', `Failed to read file ${srcPath}: ${error.message}`)
    return ''
  }
}

// ----- Global Node Modules Path -----
// Returns the path to global node_modules depending on the platform

export function getGlobalNodeModulesPath(): string {
  try {
    const prefix = execSync('npm config get prefix', { encoding: 'utf-8' }).trim();
    if (!prefix) throw new Error('Empty prefix');
    return process.platform === 'win32'
      ? path.join(prefix, 'node_modules', 'minimaz-cli')
      : path.join(prefix, 'lib', 'node_modules', 'minimaz-cli');
  } catch {
    // fallback
    return process.platform === 'win32'
      ? path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'minimaz-cli')
      : '/usr/local/lib/node_modules/minimaz-cli';
  }
}


// ----- Create Global Templates Folder -----
// Creates ~/.minimaz/templates and copies default templates if folder is empty
export async function createGlobalDir(): Promise<void> {
  const minimazDir = path.join(os.homedir(), '.minimaz')
  const globalTemplatesDir = path.join(minimazDir, 'templates')
  const defaultTemplatesDir = path.join(getGlobalNodeModulesPath(), 'src', 'templates')
  const settingsPath = path.join(minimazDir, 'settings.json')

  console.log(defaultTemplatesDir)

  // ----- Ensure node_modules path exists (fallback for portable setups) -----

  try {
    // ----- Ensure minimaz dir exists -----
    await fs.ensureDir(minimazDir)

    // ----- Create settings.json if missing -----
    if (!await fs.pathExists(settingsPath)) {
      const defaultSettings = {
        createdAt: new Date().toISOString(),
        templatesPath: globalTemplatesDir,
        npmGlobalPath: getGlobalNodeModulesPath()
      }
      await fs.outputJson(settingsPath, defaultSettings, { spaces: 2 })
      log('success', `Created settings.json at ${settingsPath}`)
    }

    // ----- Check if templates folder exists -----
    const exists = await fs.pathExists(globalTemplatesDir)
    const isEmpty = exists ? (await fs.readdir(globalTemplatesDir)).length === 0 : true

    if (!exists) {
      await fs.ensureDir(globalTemplatesDir)
      log('success', 'Created global templates directory.')
    }

    // ----- Skip copy if not empty -----
    if (!isEmpty) {
      log('info', 'Global templates directory not empty. Skipping copy.')
      return
    }

    const templates: string[] = await fs.readdir(defaultTemplatesDir)

    console.log(templates)
    // ----- Copy default templates -----
    for (const name of await fs.readdir(defaultTemplatesDir)) {
      await fs.copy(path.join(defaultTemplatesDir, name), path.join(globalTemplatesDir, name))
      log('success', `Copied template '${name}'.`)
    }

    log('success', 'Default templates setup completed.')
  } catch (error: any) {
    log('error', `Failed to create global templates directory: ${error.message}`)
    throw error
  }
}