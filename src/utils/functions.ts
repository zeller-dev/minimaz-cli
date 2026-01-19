import readline from 'readline'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { execSync, spawn } from 'child_process'

import {
  log,
  Args
} from '../index.js'

// @TODO add cache manager?

/**
 * Parses raw CLI arguments into a structured object.
 *
 * Supports:
 * - flags (--flag, -f)
 * - key-value pairs (--key value or --key=value)
 * - positional arguments
 *
 * @param rawArgs - Array of raw arguments from CLI
 * @returns Parsed arguments object
 */
export function parseArgs(rawArgs: string[]): Args {
  console.log("rawArgs:", rawArgs)
  const args: Args = { _: [] }

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i]

    // Positional argument
    if (!arg.startsWith('-')) {
      args._.push(arg)
      continue
    }

    // --key=value syntax
    if (arg.startsWith('--') && arg.includes('=')) {
      const [key, value] = arg.slice(2).split('=')
      args[key] = value
      continue
    }

    const key = arg.replace(/^-+/, '')
    const next = rawArgs[i + 1]

    if (next && !next.startsWith('-')) {
      args[key] = next
      i++
    } else {
      args[key] = true
    }
  }

  return args
}

/**
 * Prompts the user for input via CLI and returns the trimmed answer.
 *
 * @param query - Question displayed to the user
 * @returns User input as a trimmed string
 */
export function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.question(`❓\t${query}\t`, answer => {
      rl.close()
      resolve(answer.trim().toLocaleLowerCase())
    })

    rl.on('SIGINT', () => {
      rl.close()
      process.exit(130)
    })
  })
}

/**
 * Lists all available templates in a directory.
 *
 * @param dir - Templates directory path
 */
export async function listTemplates(dir: string): Promise<void> {
  if (!await fs.pathExists(dir)) {
    log('info', 'No templates directory found.')
    return
  }

  const templates = await fs.readdir(dir)

  if (templates.length === 0) {
    log('info', 'No global templates available.')
    return
  }

  log('info', 'Available global templates:')
  templates.forEach(t => log('info', `- ${t}`))
}

/**
 * Applies string replacements to a given content.
 *
 * @param content - Original content string
 * @param replacements - Key-value map for replacements
 * @returns Modified string with replacements applied
 */
export function applyReplacements(
  content: string,
  replacements: Record<string, string> = {}
): string {
  return Object.entries(replacements).reduce((acc, [from, to]) => {
    if (!acc.includes(from)) {
      log('warn', `Replacement not found: ${from}`)
      return acc
    }

    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(escaped, 'g')

    return acc.replace(pattern, to)
  }, content)
}

/**
 * Reads a file and optionally applies string replacements.
 *
 * @param srcPath - Path to the source file
 * @param replace - Optional key-value replacement map
 * @returns File content as a string
 */
export async function getFile(
  srcPath: string,
  replace?: Record<string, string>
): Promise<string> {
  try {
    let file = await fs.readFile(srcPath, 'utf8')
    if (replace) file = applyReplacements(file, replace)
    return file
  } catch (error: any) {
    log('error', `Failed to read file ${srcPath}: ${error.message}`)
    return ''
  }
}

/**
 * Resolves the global node_modules path for Minimaz.
 * Handles cross-platform differences.
 *
 * @returns Path to the global Minimaz CLI installation
 */
export function getGlobalNodeModulesPath(): string {
  try {
    const prefix = execSync('npm config get prefix', { encoding: 'utf8' }).trim()
    if (!prefix) throw new Error('Empty npm prefix')

    return process.platform === 'win32'
      ? path.join(prefix, 'node_modules', 'minimaz-cli')
      : path.join(prefix, 'lib', 'node_modules', 'minimaz-cli')
  } catch {
    // Fallback paths for misconfigured or portable environments
    return process.platform === 'win32'
      ? path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'minimaz-cli')
      : '/usr/local/lib/node_modules/minimaz-cli'
  }
}

/**
 * Ensures the global Minimaz directory structure exists.
 *
 * Creates:
 * - ~/.minimaz
 * - ~/.minimaz/templates
 * - ~/.minimaz/settings.json
 *
 * Copies default templates if the templates folder is empty.
 */
export async function createGlobalDir(): Promise<void> {
  const minimazDir = path.join(os.homedir(), '.minimaz')
  const globalTemplatesDir = path.join(minimazDir, 'templates')
  const defaultTemplatesDir = path.join(getGlobalNodeModulesPath(), 'src', 'templates')
  const settingsPath = path.join(minimazDir, 'settings.json')

  try {
    await fs.ensureDir(minimazDir)

    if (!await fs.pathExists(settingsPath)) {
      await fs.outputJson(
        settingsPath,
        {
          createdAt: new Date().toISOString(),
          templatesPath: globalTemplatesDir,
          npmGlobalPath: getGlobalNodeModulesPath()
        },
        { spaces: 2 }
      )
      log('success', `Created settings.json at ${settingsPath}`)
    }

    const exists = await fs.pathExists(globalTemplatesDir)
    const isEmpty = exists ? (await fs.readdir(globalTemplatesDir)).length === 0 : true

    if (!exists) {
      await fs.ensureDir(globalTemplatesDir)
      log('success', 'Created global templates directory.')
    }

    if (!isEmpty) {
      log('info', 'Global templates directory not empty. Skipping copy.')
      return
    }

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

/**
 * Executes a shell command in a cross-platform safe way.
 *
 * @param command - Command name (e.g. 'npm')
 * @param args - Command arguments (e.g. ['install'])
 * @param targetDir - Working directory
 */
export function executeCommand(
  command: string,
  args: string[],
  targetDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    log('info', `Running: ${command} ${args.join(' ')}`)
    const child = spawn(command, args, {
      cwd: targetDir,
      stdio: 'inherit',
      shell: true,
    })

    child.on('error', reject)

    child.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`${command} exited with code ${code}`))
    })
  })
}

/**
 * Creates a file from a template.
 * - Objects are serialized as JSON with 2-space indentation.
 * - Strings are written as-is.
 * - Parent directories are created automatically.
 *
 * @param template - Template content (object or string)
 * @param outputPath - File path to write
 */
export async function createFileFromTemplate(
  template: Record<string, unknown> | string,
  outputPath: string
): Promise<void> {
  const content =
    typeof template === 'string'
      ? template.endsWith('\n') ? template : template + '\n'
      : JSON.stringify(template, null, 2) + '\n'

  try {
    await fs.outputFile(outputPath, content)
  } catch (error: any) {
    throw new Error(`Failed to create file at '${outputPath}': ${error.message}`)
  }
}

/**
 * Initializes a Git repository in the given directory.
 *
 * @param targetDir - Directory to initialize Git
 * @param options - Git options, including remote configuration
 */
export async function initGit(
  targetDir: string,
  options: any
): Promise<void> {
  log('info', 'Initializing Git repository...')
  await executeCommand('git', ['init'], targetDir)

  if (options.remote) {
    await setupGitRemote(targetDir, options.remote)
  }

  log('success', 'Git repository initialized.')
}

/**
 * Sets up a Git remote for a repository.
 *
 * @param targetDir - Repository directory
 * @param remote - Remote configuration (url or provider)
 */
async function setupGitRemote(targetDir: string, remote: any): Promise<void> {
  const name = remote?.name ?? 'origin'

  if (remote?.url) {
    log('info', `Adding git remote '${name}'`)
    await executeCommand('git', ['remote', 'add', name, remote.url], targetDir)
    return
  }

  if (remote?.provider) {
    await createProviderRepo(targetDir, remote.provider, name)
    return
  }

  throw new Error('Git remote configuration is invalid.')
}

/**
 * Creates a repository on a provider (GitHub or GitLab) and adds it as a remote.
 *
 * @param targetDir - Local directory of the repository
 * @param provider - 'github' or 'gitlab'
 * @param remoteName - Name of the remote to add
 */
async function createProviderRepo(
  targetDir: string,
  provider: 'github' | 'gitlab',
  remoteName: string
): Promise<void> {
  const repoName = path.basename(targetDir)

  switch (provider) {
    case 'github':
      await executeCommand(
        'gh',
        ['repo', 'create', repoName, '--source=.', '--remote', remoteName],
        targetDir
      )
      break

    case 'gitlab':
      await executeCommand(
        'glab',
        ['repo', 'create', repoName, '--source=.'],
        targetDir
      )
      break
  }
}