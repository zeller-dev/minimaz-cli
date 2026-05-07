
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
    normalize,
    resolve
} from "node:path"

import {
    createInterface
} from "node:readline"

import {
    // --- CONSTANTS ---
    defaults,

    // --- FUNCTIONS ---
    log
} from "./index.js"

import {
    validateConfig
} from "./validate/index.js"

import { rawFileCache } from "./cache/index.js"
import type {
    MinimazConfig, Settings,
} from "./types.js"

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

        const timer = setTimeout(
            () => {
                rl.close()
                resolve(defaultAnswer)
            }, 60000
        )

        rl.question(
            `[QUESTION] ${query}`,
            answer => {
                clearTimeout(timer)
                rl.close()
                resolve(
                    answer.trim() || defaultAnswer
                )
            }
        )

        rl.on(
            "SIGINT",
            () => {
                clearTimeout(timer)
                rl.close()
                process.exit(130)
            }
        )
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
        // Escape special characters for RegExp
        const escaped: string =
            from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const pattern: RegExp =
            new RegExp(escaped, "g")

        return acc.replace(pattern, to)
    }, content)
}
/**
 * Reads a file and optionally applies string replacements.
 * Implementation uses a Memory Cache to avoid redundant I/O operations.
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
        const normalizedPath: string =
            normalize(srcPath)
        let fileContent: string

        // 1. Check if the raw content is already in memory
        if (rawFileCache.has(normalizedPath)) {
            fileContent =
                rawFileCache.get(normalizedPath)!
            log.debug(
                `Cache hit: ${normalizedPath}`
            )
        } else {
            // 2. First time reading: Hit the disk
            fileContent = await readFile(
                normalizedPath,
                "utf8"
            )

            // 3. Store the raw version for future calls (Discovery or Processing)
            rawFileCache.set(
                normalizedPath,
                fileContent
            )
            log.debug(
                `Cache miss (Disk read): ${normalizedPath}`
            )
        }

        // 4. Apply replacements on the content (always performed on the memory string)
        if (replace)
            fileContent = applyReplacements(
                fileContent,
                replace
            )

        return fileContent
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : String(error)

        log.error(
            `Failed to read file ${srcPath}: ${message}`
        )

        return ""
    }
}

/**
 * Resolves the global node_modules path for Minimaz.
 * Handles cross-platform differences.
 *
 * @returns Path to the global Minimaz CLI installation
 */
export function getGlobalNodeModulesPath(): string {
    log.debug(
        `Getting global node modules`
    )

    try {
        const prefix: string =
            execSync(
                "npm config get prefix", { encoding: "utf8" }
            ).trim()

        if (!prefix)
            throw new Error("Empty npm prefix")

        return process.platform === "win32"
            ? join(
                prefix,
                "node_modules",
                "minimaz-cli"
            )
            : join(
                prefix,
                "lib",
                "node_modules",
                "minimaz-cli"
            )
    } catch {
        // Fallback paths for misconfigured or portable environments
        return process.platform === "win32"
            ? join(
                process.env.APPDATA || "",
                "npm",
                "node_modules",
                "minimaz-cli"
            )
            : "/usr/local/lib/node_modules/minimaz-cli"
    }
}

/**
 * Returns the path to the global Minimaz directory.
 * Throws an error if the directory does not exist.
 */
export async function getGlobalDirPath(): Promise<string> {
    log.debug(
        `Checking existence of global Minimaz directory`
    )
    const dir: string = join(
        homedir(),
        defaults.globalDir
    )
    const exists: boolean =
        await pathExists(dir)
    if (!exists)
        throw new Error(
            `Global Minimaz folder does not exist.Run "minimaz config" to generate it`
        )

    return dir
}

/**
 * Returns the global templates directory"s
 */
export async function getGlobalTemplatesDirPath(): Promise<string> {
    log.debug(
        "Getting global templates directory"
    )
    const dir: string =
        join(await getGlobalDirPath(), "templates")
    const exists: boolean =
        await pathExists(dir)
    if (!exists)
        throw new Error(
            `Template directory not found in global directory`
        )

    return dir
}

export async function getGlobalTemplatePath(
    template: string
): Promise<string> {
    log.debug(
        `Getting template "${template}"directory`
    )
    const dir: string =
        join(
            await getGlobalTemplatesDirPath(),
            template
        )
    const exists: boolean =
        await pathExists(dir)
    if (!exists)
        throw new Error(
            `Template "${template}" not found`
        )

    return dir
}

/**
 * Returns the node modules templates directory"s path
 */
export async function getNodeModulesTemplatesPath(): Promise<string> {
    log.debug(
        "Getting default templates directory"
    )

    const dir: string =
        join(
            getGlobalNodeModulesPath(),
            "templates"
        )

    const exists: boolean =
        await pathExists(dir)
    if (!exists)
        throw new Error(
            "Default template folder not found"
        )

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
    log.debug(
        `Running: ${command} ${args.join(" ")}`
    )

    return new Promise((resolve, reject) => {
        const child: ChildProcess =
            spawn(
                command, args, {
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
    template: object | string,
    pathComponents: string[],
    overwrite: boolean = true
): Promise<void> {
    log.debug(
        "Creating file from template"
    )
    const outputPath: string =
        resolve(...pathComponents)
    let content = ""

    if (template !== undefined) {
        if (
            typeof template === "string"
        ) {
            content =
                template.endsWith("\n")
                    ? template
                    : `${template}\n`
        } else if (
            typeof template === "object"
            && template !== null
        ) {
            content = `${JSON.stringify(template, null, 2)}\n`
        } else {
            throw new Error(
                "Unsupported template type. Must be string or object"
            )
        }
    }

    try {
        if (!overwrite && await pathExists(outputPath)) {
            log.info(
                `File already exists at "${outputPath}", skipping`
            )
            return
        }
        await outputFile(outputPath, content)
    } catch (error: unknown) {
        const message: string =
            error instanceof Error
                ? error.message
                : String(error)
        throw new Error(
            `Failed to create file at "${outputPath}": ${message}`,
            { cause: error }
        )
    }
}

/**
 * Removes Dist Directory
 */
export async function removeOutDir(
    dir?: string
): Promise<void> {
    log.debug(
        "Output Directory: removing"
    )

    const outputDir: string = dir
        ? isAbsolute(dir)
            ? dir
            : resolveCurrentPath([dir])
        : resolve(
            process.cwd(),
            (await loadConfig()).output.dir
            ?? defaults.outputDir
        )
    const rootDir: string = process.cwd()

    if (
        outputDir === rootDir
        || outputDir.length <= rootDir.length
    )
        throw new Error(
            `Refusing to delete unsafe directory: ${outputDir}`
        )

    if (!await pathExists(outputDir)) {
        log.debug(
            `No output.dir folder found: ${outputDir}`
        )
        return
    }

    await remove(outputDir)
    log.success(
        "Output Directory: removed"
    )
}

/**
 * Loads, validates, and parses the Minimaz configuration file.
 *
 * @returns {Promise<MinimazConfig>} A promise that resolves to the configuration object.
 * @throws {Error} If the config file is missing or contains invalid JSON.
 */
export async function loadConfig(): Promise<MinimazConfig> {
    log.info(
        "Loading minimaz.config.json"
    )
    const configPath: string =
        resolveCurrentPath(["minimaz.config.json"])

    // Check if the configuration file exists
    if (!(await pathExists(configPath))) {
        throw new Error(
            "minimaz.config.json not found"
        )
    }

    try {
        // 1. Read the file content as a raw string
        const rawContent: string =
            await readFile(configPath, "utf-8")

        // 2. Perform validation (passing the raw string to the validator)
        // We do this before parsing to catch syntax errors or schema violations
        validateConfig(configPath, rawContent)

        // 3. Parse the JSON string into the MinimazConfig type
        const config: MinimazConfig =
            JSON.parse(rawContent) as MinimazConfig

        log.success(
            "Loaded config from minimaz.config.json"
        )

        return config
    } catch (error) {
        // Handle potential JSON parsing errors or validation failures
        const message =
            error instanceof Error
                ? error.message
                : String(error)

        throw new Error(
            `Failed to load configuration: ${message}`,
            { cause: error }
        )
    }
}

/**
 * Resolve a path relative to the CLI"s current working directory
 *
 * @param components optional path segments to append
 */
export function resolveCurrentPath(
    components: string[] = []
): string {
    log.debug(
        "Current path: resolving"
    )

    const path = resolve(
        process.env.CLI_WORKDIR ?? process.cwd(),
        ...components
    )
    log.debug(
        `Current path: ${path}`
    )

    return path
}

/**
 * Reads and parses a JSON file using native Node.js fs/promises.
 *
 * @param file - Path to the JSON file
 */
export async function readJsonFile<T>(
    file: string
): Promise<T> {
    const exists: boolean =
        await pathExists(file)

    if (!exists)
        throw new Error(
            `NOT FOUND: "${file}" does not exist`
        )

    try {
        const content: string =
            await readFile(file, "utf8")

        // Castiamo il risultato a T
        return JSON.parse(content) as T
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : String(error)

        throw new Error(
            `PARSE ERROR: Failed to parse JSON in "${file}" - ${message}`,
            { cause: error }
        )
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
    log.debug(
        `Reading elements of ${dir}`
    )
    const exists: boolean =
        await pathExists(dir)
    if (!exists) {
        log.warn(
            `Directory does not exist: ${dir}`
        )
        return []
    }
    return await readdir(dir)
}

export function getSettingsTemplate(
    globalTemplatesDir: string
): Settings {
    return {
        createdAt: new Date().toISOString(),
        templatesPath: globalTemplatesDir,
        npmGlobalPath: getGlobalNodeModulesPath()
    }
}

export function parseBooleanFlag(flag?: string | boolean): boolean {
    if (flag === undefined)
        return false    // undefined → false
    if (typeof flag === "boolean")
        return flag     // true/false boolean → keep
    const val: string = flag.toLowerCase()
    return val === "true" || val === "" // --flag or --flag=true → true
}
