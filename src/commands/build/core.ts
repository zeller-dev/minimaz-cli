import {
    transform,
    Message,
    TransformOptions
} from "esbuild"

import {
    copy,
    ensureDir,
    pathExists
} from "fs-extra"

import {
    lstat
} from "node:fs/promises"

import {
    basename,
    extname,
    join,
    resolve
} from "node:path"

import {
    // --- FUNCTIONS ---
    getDirElements, getFile, log, resolveCurrentPath,

    // --- TYPES ---
    File, MinimazConfig
} from "../../index.js"

import {
    processCSS, processHTML, processJS, processTS
} from "./index.js"

/**
 * INTERNAL CORE: Handles the heavy lifting for esbuild (JS/CSS)
 */
export async function runTransform(
    code: string,
    options: TransformOptions,
    context: string
): Promise<string> {
    if (typeof code !== "string")
        throw new Error(`[${context}] Input must be a string.`)

    const input: string = code.trim()
    if (!input) return ""

    try {
        const { code: output } =
            await transform(
                input,
                {
                    ...options,
                    charset: "utf8",
                    logLevel: "silent",
                }
            )
        return output ?? ""
    } catch (error: any) {
        const details =
            (error.errors as Message[] || [])
                .map(m => `[Line ${m.location?.line ?? "?"}] ${m.text}`)
                .join("\n")
        throw new Error(
            `[${context} Failed]\n${details || error.message}`
        )
    }
}

/**
 * Processes a single source folder.
 */
export async function processFolder(
    from: string,
    to: string,
    config: MinimazConfig,
    ignoredFiles: Set<string>
): Promise<void> {
    if (!(await pathExists(from))) {
        log(
            "warn",
            `Folder not found: ${from}`
        )
        return
    }
    await walkFolder(from, to, config, ignoredFiles)
    log("success", `Folder processed: ${from} -> ${to}`)
}

/**
 * Recursively walks a directory and processes its files.
 * Skips files present in the ignoredFiles Set.
 */
export async function walkFolder(
    from: string,
    to: string,
    config: MinimazConfig,
    ignoredFiles: Set<string>
): Promise<void> {
    await ensureDir(to)

    for (
        const item
        of await getDirElements(from)
    ) {
        const fromPath: string = join(from, item)
        const toPath: string = join(to, item)

        // EXCLUSION LOGIC: Skip if this file was imported/bundled elsewhere
        if (ignoredFiles.has(resolve(fromPath))) {
            log(
                "debug",
                `Skipping ${item}: Already bundled as a dependency.`
            )
            continue
        }

        const stat: any = await lstat(fromPath)

        if (stat.isDirectory()) {
            await walkFolder(
                fromPath,
                toPath,
                config,
                ignoredFiles
            )
            continue
        }

        const fileContent: string =
            await getFile(fromPath, config.replace)

        if (fileContent.length > 0) {
            const fileExt: string = extname(fromPath).toLowerCase()

            await processFile(
                {
                    src: fromPath,
                    dest: toPath,
                    content: fileContent,
                    ext: fileExt
                },
                config,
                ignoredFiles
            )
        }
    }
}

/**
 * Processes a single file based on its extension.
 */
export async function processFile(
    file: File,
    config: MinimazConfig,
    ignoredFiles: Set<string>
): Promise<void> {
    log("debug", `File processing: ${file.src}`)

    switch (file.ext) {
        case ".html": {
            await processHTML(file, config)
            break
        }

        case ".css": {
            await processCSS(
                file,
                // We pass a dummy bundle object or handle it inside processCSS
                // For this implementation, we assume processCSS handles the push
                { chunks: [] } as any,
                !!config.bundling?.css?.enabled,
                !!config.minify?.css,
                ignoredFiles
            )
            break
        }

        case ".js": {
            await processJS(
                file,
                { chunks: [] } as any,
                !!config.bundling?.js?.enabled,
                !!config.minify?.js,
                ignoredFiles
            )
            break
        }

        case ".tsx":
        case ".ts": {
            await processTS(
                file,
                { chunks: [] } as any,
                !!config.bundling?.js?.enabled,
                !!config.minify?.js,
                ignoredFiles
            )
            break
        }

        default:
            await copy(file.src, file.dest)
    }
}

/**
 * Processes external resources while respecting the ignoredFiles Set.
 */
export async function processExternals(
    outDirPath: string,
    externals: string[],
    config: MinimazConfig,
    ignoredFiles: Set<string>
): Promise<void> {
    log("info", "Processing externals...")

    for (
        const external
        of externals
    ) {
        const fullPath: string =
            resolveCurrentPath([external])

        // Skip if already swallowed by an import elsewhere
        if (ignoredFiles.has(fullPath)) continue

        if (!(await pathExists(fullPath))) {
            log(
                "warn",
                `External not found: ${external}`
            )
            continue
        }

        const stat = await lstat(fullPath)

        if (stat.isDirectory()) {
            await walkFolder(
                fullPath,
                outDirPath,
                config,
                ignoredFiles
            )
            continue
        }

        const ext: string =
            extname(fullPath).toLowerCase()

        const content: string =
            await getFile(fullPath, config.replace)

        await processFile(
            {
                src: fullPath,
                dest: join(outDirPath, basename(fullPath)),
                content,
                ext
            },
            config,
            ignoredFiles
        )
    }
}