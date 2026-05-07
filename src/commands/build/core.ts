import {
    Message,
    transform,
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
    dirname,
    extname,
    join,
    normalize,
    resolve
} from "node:path"

import {
    getDirElements,
    getFile,
    log,
    removeOutDir,
    resolveCurrentPath,
} from "../../shared/index.js"

import type {
    File,
    MinimazConfig
} from "../../shared/index.js"

import {
    processCSS,
    processHTML,
    processJS,
    processTS
} from "./processors/index.js"

import type {
    Bundle
} from "./types.js"

/**
 * Executes an esbuild transform for a given input string.
 */
export async function runTransform(
    code: string,
    options: TransformOptions,
    context: string
): Promise<string> {
    if (typeof code !== "string")
        throw new Error(`[${context}] Input must be a string`)

    const input: string = code.trim()

    if (!input) {
        log.debug(`[${context}] empty input skipped`)
        return ""
    }

    log.debug(`[${context}] transform start`)

    try {
        const { code: output } = await transform(input, {
            ...options,
            charset: "utf8",
            logLevel: "silent",
        })

        log.debug(`[${context}] transform success`)
        return output ?? ""
    } catch (error: unknown) {
        const err = error as { errors?: Message[], message?: string }
        const details = (err.errors || [])
            .map(m => `[Line ${m.location?.line ?? "?"}] ${m.text}`)
            .join("\n")

        log.error(`[${context} Failed]\n${details || err.message}`)
        return ""
    }
}

/**
 * Entry point for processing a directory.
 */
export async function processFolder(
    from: string,
    to: string,
    config: MinimazConfig,
    ignoredFiles: Set<string>
): Promise<void> {
    log.debug(`processFolder: start ${from} -> ${to}`)

    if (!(await pathExists(from))) {
        log.warn(`Folder not found: ${from}`)
        return
    }

    await walkFolder(from, to, config, ignoredFiles)
    log.success(`processFolder: done ${from} -> ${to}`)
}
/**
 * Recursively crawls the input directory to process files and map directories.
 *
 * Logic Flow:
 * 1. Checks 'mapping' rules at the root level to flatten or redirect folders.
 *    Example: mapping "pages": "" -> src/pages/index.html becomes dist/index.html
 * 2. Skips files identified by processors as "already bundled" (via ignoredFiles).
 * 3. Dispatches files to specific processors (JS, TS, CSS, HTML) based on extension.
 *
 * @param from - Current source directory path.
 * @param to - Current destination directory path.
 * @param config - The validated Minimaz configuration object.
 * @param ignoredFiles - A Set of paths to skip (managed by esbuild metafile discovery).
 */
export async function walkFolder(
    from: string,
    to: string,
    config: MinimazConfig,
    ignoredFiles: Set<string>
): Promise<void> {
    const items = await getDirElements(from)

    // Resolve absolute anchors once to ensure mapping logic is context-aware
    const absoluteRootDir = resolveCurrentPath([config.input.dir])
    const absoluteOutDir = resolveCurrentPath([config.output.dir])
    const absoluteFrom = resolve(from)

    for (const i of items) {
        // 1. Filter out excluded patterns (e.g., node_modules, test folders)
        if (config.input.exclude?.includes(i)) continue

        const fromPath = join(from, i)
        const normalizedFrom = normalize(fromPath)

        const mapping = config.input.mapping || {}
        const mappedValue = mapping[i]

        let nextToPath: string

        /**
         * DIRECTORY MAPPING LOGIC
         * Only triggers when 'from' is the root source directory.
         * We join to mappedValue but OMIT 'i' to flatten the folder structure.
         */
        if (absoluteFrom === absoluteRootDir && typeof mappedValue === "string") {
            nextToPath = join(absoluteOutDir, mappedValue)
        } else {
            // Standard recursive behavior: keep the sub-item name relative to current 'to'
            nextToPath = join(to, i)
        }

        // 2. Skip files already bundled by esbuild or identified as dependencies
        if (ignoredFiles.has(normalizedFrom)) {
            log.debug(`Skipping bundled dependency: ${normalizedFrom}`)
            continue
        }

        const stat = await lstat(fromPath)

        if (stat.isDirectory()) {
            // Recurse into subdirectories with the resolved destination path
            await walkFolder(fromPath, nextToPath, config, ignoredFiles)
            continue
        }

        // 3. File Processing
        // Ensure the directory exists in dist (crucial for mapped/redirected files)
        await ensureDir(dirname(nextToPath))

        /**
         * getFile utilizes rawFileCache and applies config.output.replace.
         * Note: If bundling is enabled, esbuild will read from disk, bypassing replacements
         * in sub-dependencies. Use esbuild 'define' for global constant replacements.
         */
        const fileContent = await getFile(
            fromPath,
            config.output.replace
        )
        const fileExt = extname(fromPath).toLowerCase()

        await processFile(
            {
                src: fromPath,
                dest: nextToPath,
                content: fileContent,
                ext: fileExt
            },
            config,
            ignoredFiles
        )
    }
}

/**
 * Dispatches file processing based on extension.
 */
export async function processFile(
    file: File,
    config: MinimazConfig,
    ignoredFiles: Set<string>
): Promise<void> {
    const emptyBundle: Bundle = { chunks: [], outFile: file.dest }

    switch (file.ext) {
        case ".html":
            await processHTML(file, config)
            break
        case ".css":
            await processCSS(
                file,
                emptyBundle,
                ignoredFiles,
                !!config.output?.css?.bundling,
                !!config.output?.css?.minify,
                config.input.externals,
                config.output.replace

            )
            break
        case ".js":
            await processJS(
                file,
                emptyBundle,
                ignoredFiles,
                !!config.output?.js?.bundling,
                !!config.output?.js?.minify,
                config.input?.externals,
                config.output?.replace
            )
            break
        case ".ts":
        case ".tsx":
            await processTS(
                file,
                emptyBundle,
                ignoredFiles,
                !!config.output?.js?.bundling,
                !!config.output?.js?.minify,
                config.input?.externals,
                config.output?.replace
            )
            break
        default:
            await copy(file.src, file.dest)
    }
}

/**
 * Processes external resources defined in config.
 */
export async function processExternals(
    outDirPath: string,
    externals: Record<string, string>,
    config: MinimazConfig,
    ignoredFiles: Set<string>
): Promise<void> {
    for (const [source, destination] of Object.entries(externals)) {
        if (source.startsWith("http")) {
            log.info(`Remote external: ${source} → ${destination}`)
            continue
        }

        const fullPath = resolveCurrentPath([source])
        if (ignoredFiles.has(normalize(fullPath))) continue

        if (!(await pathExists(fullPath))) {
            log.warn(`External not found: ${source}`)
            continue
        }

        const targetPath = join(outDirPath, destination)
        const stat = await lstat(fullPath)

        if (stat.isDirectory()) {
            await walkFolder(fullPath, targetPath, config, ignoredFiles)
            continue
        }

        const content = await getFile(
            fullPath, config.output.replace
        )

        await processFile(
            {
                src: fullPath,
                dest: targetPath,
                content: content,
                ext: extname(fullPath).toLowerCase()
            },
            config,
            ignoredFiles
        )
    }
}

/**
 * Recreates output directory.
 */
export async function reCreateOutDir(path: string): Promise<void> {
    await removeOutDir(path)
    await ensureDir(path)
}

/**
 * Extracts dependency paths from file content using unified regex patterns.
 */
export function extractImports(content: string, ext: string): string[] {
    const imports: string[] = []
    const jsLikePattern = /import\s+(?:(?:[\w\s{},*]+\s+from\s+)?["'](.+?)["']|["'](.+?)["'])\s*;?/g

    const patterns: Record<string, RegExp> = {
        ".css": /@import\s+(?:url\s*\()?\s*["']([^"']+)["']\s*\)?\s*;?/g,
        ".js": jsLikePattern,
        ".ts": jsLikePattern,
        ".tsx": jsLikePattern,
    }

    const regex = patterns[ext]
    if (!regex) return []

    const matches = Array.from(content.matchAll(regex))
    for (const match of matches) {
        const path = match[1] || match[2]
        if (path) imports.push(path)
    }

    return imports
}

/**
 * Inlines dependencies directly into file content recursively.
 */
export async function inlineDependencies(
    content: string,
    ext: string,
    resolver: (importPath: string) => Promise<string>,
    seen = new Set<string>()
): Promise<string> {
    const jsLikePattern = /import\s+(?:(?:[\w\s{},*]+\s+from\s+)?["'](.+?)["']|["'](.+?)["'])\s*;?/g
    const patterns: Record<string, RegExp> = {
        ".css": /@import\s+(?:url\s*\()?\s*["']([^"']+)["']\s*\)?\s*;?/g,
        ".js": jsLikePattern,
        ".ts": jsLikePattern,
        ".tsx": jsLikePattern,
    }

    const regex = patterns[ext]
    if (!regex) return content

    let result = content
    const matches = Array.from(content.matchAll(regex))

    for (const match of matches) {
        const importPath = match[1] || match[2]
        if (!importPath) continue

        if (seen.has(importPath)) {
            result = result.replace(match[0], `/* Circular dependency: ${importPath} */`)
            continue
        }

        seen.add(importPath)

        try {
            const rawContent = await resolver(importPath)
            const inlined = await inlineDependencies(rawContent, ext, resolver, seen)
            result = result.replace(match[0], inlined)
        } catch (error) {
            log.error(`Failed to inline [${importPath}]: ${(error as Error).message}`)
            continue
        }
    }
    return result
}

/**
 * INTERNAL CORE: Discovery Walk
 */
export async function runDiscovery(
    currentDir: string,
    config: MinimazConfig,
    ignoredFiles: Set<string>,
    replacements: Record<string, string>
): Promise<void> {
    const elements = await getDirElements(currentDir)

    for (const item of elements) {
        if (config.input.exclude?.includes(item)) continue

        const fullPath = join(currentDir, item)
        const stat = await lstat(fullPath)

        if (stat.isDirectory()) {
            await runDiscovery(
                fullPath,
                config,
                ignoredFiles,
                replacements
            )
            continue
        }

        const ext = extname(fullPath).toLowerCase()
        if (['.css', '.js', '.ts', '.tsx'].includes(ext)) {
            const content = await getFile(
                fullPath,
                replacements
            )
            const dependencies = extractImports(content, ext)

            for (const dep of dependencies) {
                let resolvedDep = resolve(dirname(fullPath), dep)

                if (!extname(resolvedDep)) {
                    for (const candidateExt of ['.ts', '.js', '.css', '.tsx']) {
                        if (await pathExists(resolvedDep + candidateExt)) {
                            resolvedDep += candidateExt
                            break
                        }
                    }
                }
                ignoredFiles.add(normalize(resolvedDep))
            }
        }
    }
}