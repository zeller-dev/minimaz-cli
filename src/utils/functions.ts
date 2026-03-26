import readline from 'readline'
import fs from 'fs-extra'
import path from 'path'
import spawn from 'cross-spawn'
import { homedir } from 'os'
import { execSync } from 'child_process'

import {
    log,                                  // utils
    Args, MinimazConfig,                  // types
    minimazConfigTemplate,    // constants
    colors
} from '../index.js'

// @TODO add cache

/**
 * Parses raw CLI arguments into a structured object.
 *
 * @param rawArgs - Array of raw arguments from CLI
 * @returns Parsed arguments object
 */
export function parseArgs(rawArgs: string[]): Args {
    const args: Args = { _: [] }

    for (let i = 0; i < rawArgs.length; i++) {
        const arg: string = rawArgs[i].toLowerCase();

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
export async function getGlobalNodeModulesPath(): Promise<string> {
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
export async function getGlobalDirPath(): Promise<string> {
    await createGlobalDir()
    return path.join(homedir(), '.minimaz')
}

/**
 * Returns the global templates directory's path.
 */
export async function getGlobalTemplatesDirPath(): Promise<string> {
    return path.join(await getGlobalDirPath(), 'templates')
}

export async function getGlobalTemplatePath(templateName: string): Promise<string> {
    return path.join(await getGlobalTemplatesDirPath(), templateName)
}

/**
 * Returns the node modules templates directory's path
 */
export async function getNodeModulesTemplatesPath(): Promise<string> {
    return path.join(await getGlobalNodeModulesPath(), 'templates')
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
    const minimazDir: string = path.join(homedir(), '.minimaz')
    const globalTemplatesDir = path.join(minimazDir, 'templates')
    const defaultTemplatesDir: string = await getNodeModulesTemplatesPath()
    const settingsPath: string = path.join(minimazDir, 'settings.json')

    try {
        await fs.ensureDir(minimazDir)

        if (!await fs.pathExists(settingsPath)) {
            await fs.outputJson(
                settingsPath,
                {
                    createdAt: new Date().toISOString(),
                    templatesPath: globalTemplatesDir,
                    npmGlobalPath: await getGlobalNodeModulesPath()
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
            log('debug', 'Global templates directory not empty. Skipping copy.')
            return
        }

        if (await fs.pathExists(defaultTemplatesDir)) {
            for (const name of await fs.readdir(defaultTemplatesDir)) {
                await fs.copy(path.join(defaultTemplatesDir, name), path.join(globalTemplatesDir, name))
                log('success', `Copied template '${name}'.`)
            }
        } else {
            log('warn', 'Default templates directory not found.')
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
        log('debug', `Running: ${command} ${args.join(' ')}`)

        const child = spawn(command, args, {
            cwd: targetDir,
            stdio: 'inherit'
        })

        child.on('error', reject)
        child.on('close', code =>
            code === 0
                ? resolve()
                : reject(new Error(`${command} exited with code ${code}`))
        )
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
    template: Record<string, unknown> | string | undefined,
    pathComponents: string[]
): Promise<void> {
    const outputPath = path.resolve(...pathComponents)

    let content = ''

    if (template !== undefined) {
        if (typeof template === 'string') {
            content = template.endsWith('\n') ? template : `${template}\n`
        } else if (typeof template === 'object' && template !== null) {
            content = `${JSON.stringify(template, null, 2)}\n`
        } else {
            throw new Error('Unsupported template type. Must be string or object.')
        }
    }

    try {
        await fs.outputFile(outputPath, content)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to create file at '${outputPath}': ${message}`)
    }
}

/**
 * Removes Dist Directory
 */
export async function removeDistDir(dir?: string): Promise<void> {
    const distDir = dir
        ? path.isAbsolute(dir) ? dir : resolveCurrentPath([dir])
        : path.resolve(process.cwd(), (await loadConfig()).outDir ?? 'dist')
    const rootDir = process.cwd()

    if (distDir === rootDir || distDir.length <= rootDir.length)
        throw new Error(`Refusing to delete unsafe directory: ${distDir}`)

    if (!await fs.pathExists(distDir)) {
        log('debug', `No dist folder found: ${distDir}`)
        return
    }

    await fs.remove(distDir)
    log('success', `Cleared ${distDir}`)
}

/**
 * Returns Minimaz Config
 */
export async function loadConfig(): Promise<MinimazConfig> {
    const configPath: string = resolveCurrentPath(['minimaz.config.json'])
    let config: MinimazConfig;

    if (await fs.pathExists(configPath)) {
        config = await fs.readJson(configPath)
        log('success', 'Loaded config from minimaz.config.json')
    } else {
        config = JSON.parse(JSON.stringify(minimazConfigTemplate))
        log('warn', 'No minimaz.config.json found. Using default config')
    }
    return config
}

/**
 * Initialize environment variables for the CLI.
 *
 * @param verbose - set true to enable verbose logging
 */
export function initEnv(verbose?: boolean): void {
    // Verbose
    process.env.VERBOSE = verbose ? 'true' : 'false'
    log('debug', `VERBOSE = ${process.env.VERBOSE}`)

    // Working Path
    process.env.CLI_WORKDIR = process.cwd()
    log('debug', `CLI_WORKDIR = ${process.env.CLI_WORKDIR}`)
}

/**
 * Resolve a path relative to the CLI's current working directory
 *
 * @param components optional path segments to append
 */
export function resolveCurrentPath(components: string[] = []): string {
    return path.resolve(
        process.env.CLI_WORKDIR ?? process.cwd(),
        ...components
    )
}

/**
 * Reads and parses a JSON file.
 *
 * @param filePath - Path to the JSON file
 */
export async function readJsonFile(filePath: string): Promise<any> {
    return await fs.readJson(filePath)
}

/**
 * Reads the contents of a directory and returns an array of file and folder names.
 *
 * @param dir - Path to the directory to read
 */
export async function getDirElements(dir: string): Promise<string[]> {
    return await fs.readdir(dir)
}

/**
 * Colorises text
 */
export function colorize(text: string, color: string): string {
    return `${color}${text}${colors.reset}`
}