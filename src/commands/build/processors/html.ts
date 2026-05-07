import {
    outputFile
} from "fs-extra"

import {
    minify
} from "html-minifier-terser"

import {
    log
} from "../../../shared/index.js"

import type {
    File,
    MinimazConfig
} from "../../../shared/index.js"

/**
 * Processes an HTML file:
 * - Handles conditional HTML minification.
 * - delegates inline JS/CSS minification to html-minifier-terser.
 * - Writes the final result to the destination.
 *
 * @param file - The file object containing src, dest, and content.
 * @param config - Minimaz configuration.
 */
export async function processHTML(
    file: File,
    config: MinimazConfig
): Promise<void> {
    log.debug(`Processing HTML: ${file.src}`)

    let result: string = file.content

    // Only minify if the config explicitly allows it
    if (config.output?.html?.minify) {
        result = await minifyHTML(result, file.src)
    }

    await outputFile(file.dest, result)
}

/**
 * Minifies HTML (Production & Development)
 * Uses html-minifier-terser for comprehensive attribute and whitespace cleanup.
 *
 * @param code - Raw HTML string.
 * @param context - Filename or path for error reporting.
 */
export async function minifyHTML(
    code: string,
    context: string = "unknown"
): Promise<string> {
    if (typeof code !== "string") {
        throw new Error(`[MinifyHTML] Input for ${context} must be a string`)
    }

    const input = code.trim()
    if (!input) return ""

    try {
        return await minify(input, {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
            minifyJS: true,   // Handles <script> tags
            minifyCSS: true,  // Handles <style> tags
            processConditionalComments: true,
            // Keep specialized syntax safe
            ignoreCustomComments: [/^!/],
            caseSensitive: true
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)

        // We log the error but don't necessarily want to crash the whole build
        // if one HTML file has a syntax error returning original code as fallback.
        log.error(`[MinifyHTML Failed in ${context}]\n${message}`)

        return code
    }
}