import {
    outputFile,
    pathExists
} from "fs-extra"

import {
    readFile
} from "node:fs/promises"

import {
    dirname,
    resolve
} from "node:path"

import {
    Bundle,
    File
} from "../../../index.js"

import {
    runTransform
} from "../index.js"
/**
 * Processes a CSS file.
 * If bundling is enabled, it resolves all imports and adds the result to the bundle.
 * If bundling is disabled, it processes and writes the file to the destination.
 */
export async function processCSS(
    file: File,
    bundle: Bundle,
    bundling: boolean,
    minifying: boolean,
    ignoredFiles: Set<string>
): Promise<void> {
    // 1. Resolve imports and track them in ignoredFiles
    const resolvedContent = await resolveImports(file.content, file.src, ignoredFiles)
    if (bundling) {
        // Add the expanded content to the shared bundle chunks
        bundle.chunks.push(resolvedContent)
    } else {
        let out: string = resolvedContent
        if (minifying)
            out = await minifyCSS(out, true)

        await outputFile(file.dest, out)
    }
}

/**
 * Recursively resolves @import statements in CSS files.
 * Inlines the content of the imported file into the source.
 * * @param content - Raw CSS content
 * @param filePath - Absolute path to the current file
 * @param ignoredFiles - Set to track files to be excluded from the main walker
 * @param visited - Set to track processed files and prevent circular imports
 */
async function resolveImports(
    content: string,
    filePath: string,
    ignoredFiles: Set<string>,
    visited: Set<string> = new Set()
): Promise<string> {
    const absPath = resolve(filePath)
    if (visited.has(absPath))
        return ""

    visited.add(absPath)
    const dir = dirname(absPath)
    const importRegex = /@import\s+['"](.+?\.css)['"]\s*;/g
    let processedContent = content
    const matches = Array.from(content.matchAll(importRegex))

    for (const match of matches) {
        const fullLine = match[0]
        const targetPath = match[1]
        const absoluteTarget = resolve(dir, targetPath)
        if (await pathExists(absoluteTarget)) {
            // Mark this file to be excluded from the main walking process
            ignoredFiles.add(absoluteTarget)
            const importedRaw = await readFile(absoluteTarget, "utf-8")
            // Recursively resolve imports inside the imported file
            const resolvedImport = await resolveImports(
                importedRaw,
                absoluteTarget,
                ignoredFiles,
                visited
            )
            processedContent = processedContent.replace(fullLine, resolvedImport)
        } else {
            console.warn(`[CSS Bundle] Import not found: ${targetPath} (searched in ${dir})`)
        }
    }

    return processedContent
}

/**
 * Minifies CSS (Production & Development)
 * Uses esbuild for high-performance optimization and syntax lowering.
 */
export async function minifyCSS(
    code: string,
    isProd: boolean = true
): Promise<string> {
    return runTransform(code, {
        loader: "css",
        minify: isProd,
        charset: "utf8",
        sourcemap: !isProd ? "inline" : false,
        legalComments: isProd ? "none" : "inline",
        target: isProd
            ? ["chrome80", "safari13", "firefox70", "edge79"]
            : "esnext",
    }, "MinifyCSS")
}