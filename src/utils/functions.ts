
import {
    ChildProcess,
    execSync
} from "child_process"

import {
    spawn
} from "cross-spawn"

import {
    outputFile,
    pathExists,
    remove
} from "fs-extra"

import {
    readdir,
    readFile
} from "node:fs/promises"

import {
    homedir
} from "node:os"

import {
    isAbsolute,
    join,
    resolve
} from "node:path"

import {
    createInterface
} from "node:readline"

import {
    // --- CONSTANTS ---
    minimazConfigTemplate,

    // --- FUNCTIONS ---
    log,

    // --- TYPES ---
    MinimazConfig, Settings,
    defaults,
} from "../index.js"

// @TODO add cache

/**
 * Prompts the user for input via CLI and returns the trimmed answer.
 *
 * @param query - Question displayed to the user
 * @returns User input as a trimmed string
 */
export function askQuestion(
    query: string,
    defaultAnswer = ""
): Promise<string> {
    return new Promise(resolve => {
        const rl = createInterface({
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

        rl.on("SIGINT", () => {
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
        const escaped: string = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const pattern: RegExp = new RegExp(escaped, "gi")
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
        let file: string = await readFile(srcPath, "utf8")
        if (replace) file = applyReplacements(file, replace)
        return file
    } catch (error: any) {
        log("error", `Failed to read file ${srcPath}: ${error.message}`)
        return ""
    }
}

/**
 * Resolves the global node_modules path for Minimaz.
 * Handles cross-platform differences.
 *
 * @returns Path to the global Minimaz CLI installation
 */
export async function getGlobalNodeModulesPath(): Promise<string> {
    log("debug", `Getting global node modules ..`)

    try {
        const prefix: string = execSync("npm config get prefix", { encoding: "utf8" }).trim()
        if (!prefix) throw new Error("Empty npm prefix")

        return process.platform === "win32"
            ? join(prefix, "node_modules", "minimaz-cli")
            : join(prefix, "lib", "node_modules", "minimaz-cli")
    } catch (error: any) {
        // Fallback paths for misconfigured or portable environments
        return process.platform === "win32"
            ? join(process.env.APPDATA || "", "npm", "node_modules", "minimaz-cli")
            : "/usr/local/lib/node_modules/minimaz-cli"
    }
}

/**
 * Returns the path to the global Minimaz directory.
 * Throws an error if the directory does not exist.
 */
export async function getGlobalDirPath(): Promise<string> {
    log("debug", `Checking existence of global Minimaz directory...`)
    const dir: string = join(homedir(), ".minimaz")
    const exists: boolean = await pathExists(dir)
    if (!exists)
        throw new Error(`Global Minimaz folder does not exist.\nRun "minimaz config" to generate it.`)

    return dir
}

/**
 * Returns the global templates directory"s
 */
export async function getGlobalTemplatesDirPath(): Promise<string> {
    log("debug", "Getting global templates directory ..")
    const dir: string = join(await getGlobalDirPath(), "templates")
    const exists: boolean = await pathExists(dir)
    if (!exists)
        throw new Error(`Template directory not found in global directory`)

    return dir
}

export async function getGlobalTemplatePath(
    template: string
): Promise<string> {
    log("debug", `Getting template "${template}"directory ..`)
    const dir: string = join(await getGlobalTemplatesDirPath(), template)
    const exists: boolean = await pathExists(dir)
    if (!exists)
        throw new Error(`Template "${template}" not found.`)

    return dir
}

/**
 * Returns the node modules templates directory"s path
 */
export async function getNodeModulesTemplatesPath(): Promise<string> {
    log("debug", "Getting default templates directory ..")
    const dir: string = join(await getGlobalNodeModulesPath(), "templates")
    const exists: boolean = await pathExists(dir)
    if (!exists)
        throw new Error("Default template folder not found")

    return dir
}

/**
 * Executes a shell command in a cross-platform safe way.
 *
 * @param command - Command name (e.g. "npm")
 * @param args - Command arguments (e.g. ["install"])
 * @param targetDir - Working directory
 */
export function executeCommand(
    command: string,
    args: string[],
    target: string
): Promise<void> {
    log("debug", `Running: ${command} ${args.join(" ")}`)

    return new Promise((resolve, reject) => {
        const child: ChildProcess = spawn(command, args, {
            cwd: target,
            stdio: "inherit"
        })

        child.on("error", reject)
        child.on("close", code =>
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
    log("debug", "Creating file from template...")
    const outputPath: string = resolve(...pathComponents)
    let content = ""

    if (template !== undefined) {
        if (typeof template === "string") {
            content = template.endsWith("\n") ? template : `${template}\n`
        } else if (typeof template === "object" && template !== null) {
            content = `${JSON.stringify(template, null, 2)}\n`
        } else {
            throw new Error("Unsupported template type. Must be string or object.")
        }
    }

    try {
        if (!overwrite && await pathExists(outputPath)) {
            log("info", `File already exists at "${outputPath}", skipping creation.`)
            return
        }
        await outputFile(outputPath, content)
    } catch (error: unknown) {
        const message: string =
            error instanceof Error
                ? error.message
                : String(error)
        throw new Error(
            `Failed to create file at "${outputPath}": ${message}`
        )
    }
}

/**
 * Removes Dist Directory
 */
export async function removeOutDir(
    dir?: string
): Promise<void> {
    log("debug", "Removing outDir...")
    const outDir = dir
        ? isAbsolute(dir) ? dir : resolveCurrentPath([dir])
        : resolve(
            process.cwd(), (await loadConfig()).outDir ?? defaults.outDir
        )
    const rootDir = process.cwd()

    if (outDir === rootDir || outDir.length <= rootDir.length)
        throw new Error(`Refusing to delete unsafe directory: ${outDir}`)

    if (!await pathExists(outDir)) {
        log("debug", `No outDir folder found: ${outDir}`)
        return
    }

    await remove(outDir)
    log("success", `Cleared ${outDir}`)
}

/**
 * Returns Minimaz Config
 */
export async function loadConfig(): Promise<MinimazConfig> {
    const configPath = resolveCurrentPath(["minimaz.config.json"])
    let config: any

    if (await pathExists(configPath)) {
        config = JSON.parse(await readFile(configPath, "utf-8"))
        log("success", "Loaded config from minimaz.config.json")
    } else {
        log("warn", "No minimaz.config.json found. Using default config")
        config = JSON.parse(JSON.stringify(minimazConfigTemplate))
    }

    // Validate required fields
    if (!config.outDir || typeof config.outDir !== "string")
        throw new Error("Invalid config: outDir must be a string")

    if (!config.folders || typeof config.folders !== "object")
        throw new Error("Invalid config: folders must be an object")

    // Optional: set defaults for optional fields
    config.bundling ??= { outDir: "" }
    config.minify ??= {}
    config.replace ??= {}

    return config as MinimazConfig
}

/**
 * Initialize environment variables for the CLI.
 *
 * @param verbose - set true to enable verbose logging
 */
export function initEnv(
    verbose?: boolean
): void {
    log("debug", "Initializing environments variables...")

    // Verbose
    process.env.VERBOSE = verbose ? "true" : "false"
    log("debug", `VERBOSE = ${process.env.VERBOSE}`)

    // Working Path
    process.env.CLI_WORKDIR = process.cwd()
    log("debug", `CLI_WORKDIR = ${process.env.CLI_WORKDIR}`)
}

/**
 * Resolve a path relative to the CLI"s current working directory
 *
 * @param components optional path segments to append
 */
export function resolveCurrentPath(
    components: string[] = []
): string {
    log("debug", "Resolving current ..")
    return resolve(
        process.env.CLI_WORKDIR ?? process.cwd(),
        ...components
    )
}

/**
 * Reads and parses a JSON file using native Node.js fs/promises.
 *
 * @param file - Path to the JSON file
 */
export async function readJsonFile(
    file: string
): Promise<any | null> {
    const exists: boolean = await pathExists(file)
    if (!exists)
        throw new Error(`NOT FOUND: "${file}" does not exist`)

    try {
        // Read the file as a UTF-8 string
        const content: string = await readFile(file, "utf8")

        // Parse and return the JSON data
        return JSON.parse(content)
    } catch (error: any) {
        throw new Error(`PARSE ERROR: Failed to parse JSON in "${file}" - ${error.message}`)
    }
}

/**
 * Reads the contents of a directory and returns an array of file and folder names.
 * Returns an empty array if the directory does not exist.
 *
 * @param dir - Path to the directory to read
 */
export async function getDirElements(
    dir: string
): Promise<string[]> {
    log("debug", `Reading elements of ${dir}...`)
    const exists: boolean = await pathExists(dir)
    if (!exists) {
        log("warn", `Directory does not exist: ${dir}`)
        return []
    }
    return await readdir(dir)
}



export async function getSettingsTemplate(
    globalTemplatesDir: string
): Promise<Settings> {
    return {
        createdAt: new Date().toISOString(),
        templatesPath: globalTemplatesDir,
        npmGlobalPath: await getGlobalNodeModulesPath()
    }
}

export function parseBooleanFlag(flag?: string | boolean): boolean {
    if (flag === undefined) return false          // undefined → false
    if (typeof flag === "boolean") return flag    // true/false boolean → keep
    const val = flag.toLowerCase()
    return val === "true" || val === ""          // --flag or --flag=true → true
}