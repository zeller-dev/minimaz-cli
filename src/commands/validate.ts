import * as esbuild from 'esbuild'
import fs from 'fs-extra'
import { minify } from 'html-minifier-terser'
import path from 'node:path'

import {
    // --- FUNCTIONS ---
    getDirElements, getFile, log, resolveCurrentPath
} from "../index.js"

/**
 * Validates a file or directory recursively.
 * Utilizes Minimaz core utilities for path resolution and file reading.
 */
export async function validate(
    targetPath: string
): Promise<number> {
    // Resolve path relative to CLI_WORKDIR if it's not absolute
    const absolutePath: string = path.isAbsolute(targetPath)
        ? targetPath
        : resolveCurrentPath([targetPath])

    if (!(await fs.pathExists(absolutePath))) {
        log('error', `Path does not exist: ${absolutePath}`)
        return 1
    }

    const stats = await fs.lstat(absolutePath)

    // --- Directory Branch ---
    if (stats.isDirectory()) {
        const elements = await getDirElements(absolutePath)

        const results = await Promise.all(
            elements.map(el => validate(path.join(absolutePath, el)))
        )

        return results.reduce((acc: number, curr: number) => acc + curr, 0)
    }

    // --- File Branch ---
    const ext = path.extname(absolutePath).toLowerCase()

    // Use your utility getFile() to handle reading
    const content = await getFile(absolutePath)
    if (!content && (await fs.readFile(absolutePath, 'utf8')).length > 0) {
        // If content is empty but file isn't, getFile logged an error already
        return 1
    }

    if (ext === '.html') {
        return (await validateHTML(absolutePath, content)) ? 0 : 1
    }

    if (['.css', '.js', '.mjs', '.ts', '.mts'].includes(ext)) {
        return (await validateWithEsbuild(absolutePath, content, ext)) ? 0 : 1
    }

    log('debug', `Skipping: ${absolutePath}`)
    return 0
}

/**
 * Validates JS, TS, and CSS using esbuild.
 */
async function validateWithEsbuild(
    filePath: string,
    content: string, ext: string
): Promise<boolean> {
    try {
        const loader = (ext === '.css' ? 'css' : (ext.includes('ts') ? 'ts' : 'js')) as esbuild.Loader

        await esbuild.transform(content, {
            loader,
            format: 'esm',
            logLevel: 'silent',
        })

        log('success', `${loader.toUpperCase()} Valid: ${filePath}`)
        return true
    } catch (error: any) {
        log('error', `Syntax Error in ${filePath}:`)

        // Handle esbuild-specific error formatting
        if (error.errors) {
            error.errors.forEach((err: any) => {
                const line = err.location?.line ?? '??'
                log('error', `   -> Line ${line}: ${err.text}`)
            })
        }
        return false
    }
}

/**
 * Validates HTML via html-minifier-terser.
 */
async function validateHTML(
    filePath: string,
    content: string
): Promise<boolean> {
    try {
        await minify(content, {
            continueOnParseError: false,
            caseSensitive: true
        })
        log('success', `HTML Valid: ${filePath}`)
        return true
    } catch (error: any) {
        log('error', `HTML Error [${filePath}]: ${error.message}`)
        return false
    }
}