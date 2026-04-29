import {
    pathExists,
    Stats
} from "fs-extra"

import {
    lstat,
    readFile
} from "node:fs/promises"

import {
    extname,
    isAbsolute,
    join
} from "node:path"

import {
    validateHTML,
    validateWithEsbuild
} from "./core.js"

import {
    // --- FUNCTIONS ---
    getDirElements, getFile, log, resolveCurrentPath
} from "../../index.js"

/**
 * Validates a file or directory recursively.
 * Utilizes Minimaz core utilities for path resolution and file reading.
 * * @param targetPath - The relative or absolute string path to validate.
 * @returns A promise that resolves when validation is complete.
 */
export async function validate(
    targetPath: string
): Promise<void> {
    // Basic sanity check for common JS-to-string edge cases
    if (targetPath === "undefined")
        throw new Error("No target path")

    // Ensure we are working with an absolute path for consistent FS operations
    const absolutePath: string = isAbsolute(targetPath)
        ? targetPath
        : resolveCurrentPath([targetPath])

    // Verify existence early to avoid lstat errors
    if (!(await pathExists(absolutePath)))
        throw new Error(`Path does not exist: ${absolutePath}`)

    const stats: Stats = await lstat(absolutePath)

    // --- Directory Branch ---
    // If it's a directory, we crawl it and validate every child element recursively
    if (stats.isDirectory()) {
        const elements: string[] =
            await getDirElements(absolutePath)

        // Process all children in parallel for better performance
        const results: void[] =
            await Promise.all(
                elements.map(el => validate(join(absolutePath, el)))
            )

        // Aggregates nested results (Note: consider updating return type to number if using this)
        return results.reduce((acc: any, curr: any) => acc + curr, 0)
    }

    // --- File Branch ---
    const ext: string = extname(absolutePath).toLowerCase()

    // Retrieve file content using internal getFile utility
    const content: string = await getFile(absolutePath)

    // Integrity check: if getFile returns nothing but the file actually has data, fail fast
    if (!content && (await readFile(absolutePath, "utf8")).length > 0)
        throw new Error(`Failed to read content from non-empty file: ${absolutePath}`)

    // Route to specialized validator based on file extension
    if (ext === ".html")
        await validateHTML(absolutePath, content)

    if ([".css", ".js", ".mjs", ".ts", ".mts"].includes(ext))
        await validateWithEsbuild(absolutePath, content, ext)

    // Log skip for unsupported or non-target file types
    log("debug", `Skipping: ${absolutePath}`)
}