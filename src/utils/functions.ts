import readline from 'readline'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { execSync, spawn } from 'child_process'

import {
  log,
  Args,
  MinimazConfig,
  loadConfig
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
  const args: Args = { _: [] }

  for (let i = 0; i < rawArgs.length; i++) {
    const arg: string = rawArgs[i]

    // Positional argument
    if (!arg.startsWith('-')) {
      args._.push(arg)
      continue
    }

    // --key=value syntax
    if (arg.startsWith('--') && arg.includes('=')) {
      const [key, value]: string[] = arg.slice(2).split('=')
      args[key] = value
      continue
    }

    const key: string = arg.replace(/^-+/, '')
    const next: string = rawArgs[i + 1]

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
export function askQuestion(
  query: string,
  defaultAnswer = ''
): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const timer = setTimeout(() => {
      rl.close()
      resolve(defaultAnswer)
    }, 60000)

    rl.question(`❓ ${query} `, answer => {
      clearTimeout(timer)
      rl.close()
      resolve(answer.trim() || defaultAnswer)
    })

    rl.on('SIGINT', () => {
      clearTimeout(timer)
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
export async function listTemplates(): Promise<void> {
  const dir: string = path.join(getGlobalDirPath(), 'templates')
  if (!await fs.pathExists(dir)) {
    log('info', 'No templates directory found.')
    return
  }

  const templates: string[] = await fs.readdir(dir)

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
    const escaped: string = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern: RegExp = new RegExp(escaped, 'gi')

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
    let file: string = await fs.readFile(srcPath, 'utf8')
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
    const prefix: string = execSync('npm config get prefix', { encoding: 'utf8' }).trim()
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
 * Returns the global directory's path.
 */
export function getGlobalDirPath(): string {
  return path.join(os.homedir(), '.minimaz')
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
  const minimazDir: string = getGlobalDirPath()
  const globalTemplatesDir: string = path.join(minimazDir, 'templates')
  const defaultTemplatesDir: string = path.join(getGlobalNodeModulesPath(), 'src', 'templates')
  const settingsPath: string = path.join(minimazDir, 'settings.json')

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

    const exists: boolean = await fs.pathExists(globalTemplatesDir)
    const isEmpty: boolean = exists ? (await fs.readdir(globalTemplatesDir)).length === 0 : true

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
 * @param remoteUrl - Optional remote URL
 * @param provider - Optional provider ('github' | 'gitlab')
 */
export async function initGit(
  projectName: string,
  targetDir: string,
  provider?: string,
  name: string = 'origin'
): Promise<void> {
  log('info', 'Initializing Git repository...')
  await executeCommand('git', ['init'], targetDir)

  if (provider) {
    await createRemoteRepo(projectName, targetDir, provider, name)
    log('success', 'Git repository initialized.')
    return
  }

  throw new Error('Git remote configuration is invalid.')
}

/**
 * Creates or connects a remote Git repository.
 *
 * Supported modes:
 * - GitHub (via gh CLI)
 * - GitLab (via glab CLI)
 * - Existing remote URL (SSH / HTTPS)
 *
 * This function does NOT create commits.
 *
 * @param repoName   - Repository name
 * @param targetDir  - Local repository directory
 * @param remote     - Provider name ('github' | 'gitlab') or remote URL
 * @param remoteName - Git remote name (default: origin)
 */
async function createRemoteRepo(
  repoName: string,
  targetDir: string,
  remote: string,
  remoteName: string = 'origin'
): Promise<void> {
  console.log(remote, remoteName, repoName, targetDir)
  /**
   * Case 1: Existing repository URL (connect only)
   */
  if (/^https?:\/\//.test(remote) || remote.startsWith('git@')) {
    log('info', `Connecting existing remote '${remote}'`)
    await executeCommand(
      'git',
      ['remote', 'add', remoteName, remote],
      targetDir
    )
    return
  }

  /**
   * Case 2: GitHub repository creation (via gh CLI)
   */
  if (remote === 'github') {
    log('info', `Creating GitHub repository '${repoName}'`)
    await executeCommand(
      'gh',
      ['repo', 'create', repoName, '--private', '--source=.', '--remote', remoteName],
      targetDir
    )
    return
  }

  /**
   * Case 3: GitLab repository creation (via glab CLI)
   */
  if (remote === 'gitlab') {
    log('info', `Creating GitLab repository '${repoName}'`)

    const gitlabUser = process.env.GITLAB_USER
    if (!gitlabUser)
      throw new Error('GITLAB_USER environment variable not set')

    await executeCommand(
      'glab',
      ['repo', 'create', repoName, '--source=.'],
      targetDir
    )

    await executeCommand(
      'git',
      [
        'remote',
        'add',
        remoteName,
        `git@gitlab.com:${gitlabUser}/${repoName}.git`
      ],
      targetDir
    )
    return
  }

  /**
   * Unsupported provider
   */
  throw new Error(`Unsupported git provider or remote: '${remote}'`)
}


/**
 * Removes Dist Directory
 *
 */
export async function removeDistDir(): Promise<void> {
  const config: MinimazConfig = await loadConfig()
  const distDir: string = path.resolve(process.cwd(), config.dist || 'dist')
  if (!fs.existsSync(distDir)) {
    log('info', `No dist folder found: ${distDir}`)
    return
  }
  fs.remove(distDir)
  log('success', `Cleared ${distDir}`)
}