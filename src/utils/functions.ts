import readline from 'readline'
import fs from 'fs-extra'
import path from 'path'
import spawn from 'cross-spawn'
import { homedir } from 'os'
import { ChildProcess, execSync } from 'child_process'

import {
    log,                                  // utils
    Args, MinimazConfig, Settings, // types
    minimazConfigTemplate, colors         // constants

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
    log('debug', `Getting global node modules path...`)

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
 * Returns the path to the global Minimaz directory.
 * Throws an error if the directory does not exist.
 */
export async function getGlobalDirPath(): Promise<string> {
    log('debug', `Checking existence of global Minimaz directory...`)
    const dir: string = path.join(homedir(), '.minimaz')
    const exists: boolean = await fs.pathExists(dir)
    if (!exists)
        throw new Error(`Global Minimaz folder does not exist.\nRun 'minimaz config' to generate it.`)

    return dir
}

/**
 * Returns the global templates directory's path.
 */
export async function getGlobalTemplatesDirPath(): Promise<string> {
    log('debug', 'Getting global templates directory path...')
    const dir: string = path.join(await getGlobalDirPath(), 'templates')
    const exists: boolean = await fs.pathExists(dir)
    if (!exists)
        throw new Error(`Template directory not found in global directory`)

    return dir
}

export async function getGlobalTemplatePath(template: string): Promise<string> {
    log('debug', `Getting template '${template}'directory path...`)
    const dir: string = path.join(await getGlobalTemplatesDirPath(), template)
    const exists: boolean = await fs.pathExists(dir)
    if (!exists)
        throw new Error(`Template '${template}' not found.`)

    return dir
}

/**
 * Returns the node modules templates directory's path
 */
export async function getNodeModulesTemplatesPath(): Promise<string> {
    log('debug', 'Getting default templates directory path...')
    const dir: string = path.join(await getGlobalNodeModulesPath(), 'templates')
    const exists: boolean = await fs.pathExists(dir)
    if (!exists)
        throw new Error('Default template folder not found')

    return dir
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
    target: string
): Promise<void> {
    log('debug', `Running: ${command} ${args.join(' ')}`)

    return new Promise((resolve, reject) => {
        const child: ChildProcess = spawn(command, args, {
            cwd: target,
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
 * @param pathComponents
 */
export async function createFileFromTemplate(
    template: Record<string, unknown> | string | undefined,
    pathComponents: string[],
    overwrite: boolean = true
): Promise<void> {
    log('debug', 'Creating file from template...')
    const outputPath: string = path.resolve(...pathComponents)
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
        if (!overwrite && await fs.pathExists(outputPath)) {
            log('info', `File already exists at '${outputPath}', skipping creation.`)
            return
        }
        await fs.outputFile(outputPath, content)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to create file at '${outputPath}': ${message}`)
    }
}

/**
 * Removes Dist Directory
 */
export async function removeOutDir(dir?: string): Promise<void> {
    log('debug', 'Removing outDir...')
    const outDir = dir
        ? path.isAbsolute(dir) ? dir : resolveCurrentPath([dir])
        : path.resolve(process.cwd(), (await loadConfig()).outDir ?? 'dist')
    const rootDir = process.cwd()

    if (outDir === rootDir || outDir.length <= rootDir.length)
        throw new Error(`Refusing to delete unsafe directory: ${outDir}`)

    if (!await fs.pathExists(outDir)) {
        log('debug', `No dist folder found: ${outDir}`)
        return
    }

    await fs.remove(outDir)
    log('success', `Cleared ${outDir}`)
}

/**
 * Returns Minimaz Config
 */
export async function loadConfig(): Promise<MinimazConfig> {
    const configPath = resolveCurrentPath(['minimaz.config.json'])
    let config: any

    if (await fs.pathExists(configPath)) {
        config = await fs.readJson(configPath)
        log('success', 'Loaded config from minimaz.config.json')
    } else {
        log('warn', 'No minimaz.config.json found. Using default config')
        config = JSON.parse(JSON.stringify(minimazConfigTemplate))
    }

    // Validate required fields
    if (!config.outDir || typeof config.outDir !== 'string')
        throw new Error('Invalid config: outDir must be a string')

    if (!config.folders || typeof config.folders !== 'object')
        throw new Error('Invalid config: folders must be an object')

    // Optional: set defaults for optional fields
    config.bundling ??= { outDir: '' }
    config.minify ??= {}
    config.replace ??= {}

    return config as MinimazConfig
}

/**
 * Initialize environment variables for the CLI.
 *
 * @param verbose - set true to enable verbose logging
 */
export function initEnv(verbose?: boolean): void {
    log('debug', 'Initializing environments variables...')

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
    log('debug', 'Resolving current path...')
    return path.resolve(
        process.env.CLI_WORKDIR ?? process.cwd(),
        ...components
    )
}

/**
 * Reads and parses a JSON file.
 *
 * @param file - Path to the JSON file
 */
export async function readJsonFile(file: string): Promise<any | null> {
    const exists: boolean = await fs.pathExists(file)
    if (!exists)
        throw new Error(`NOT FOUND: '${file}' does not exist`)

    return await fs.readJson(file)
}

/**
 * Reads the contents of a directory and returns an array of file and folder names.
 * Returns an empty array if the directory does not exist.
 *
 * @param dir - Path to the directory to read
 */
export async function getDirElements(dir: string): Promise<string[]> {
    log('debug', `Reading elements of ${dir}...`)
    const exists: boolean = await fs.pathExists(dir)
    if (!exists) {
        log('warn', `Directory does not exist: ${dir}`)
        return []
    }
    return await fs.readdir(dir)
}

/**
 * Colorises text
 */
export function colorize(text: string, color: string): string {
    return `${color}${text}${colors.reset}`
}

export async function getSettingsTemplate(globalTemplatesDir: string): Promise<Settings> {
    return {
        createdAt: new Date().toISOString(),
        templatesPath: globalTemplatesDir,
        npmGlobalPath: await getGlobalNodeModulesPath()
    }
}