import {
    outputFile
} from "fs-extra"

import {
    minify
} from "html-minifier-terser"
import {
    // --- TYPES ---
    File, MinimazConfig
} from "../../../index.js"
/**
 * Processes an HTML file:
 * - Minifies inline JavaScript (standard, module, nomodule)
 * - Minifies inline JSON scripts
 * - Leaves external scripts and other types intact
 * - Minifies CSS inline and the final HTML if configured
 *
 * @param file
 * @param config - Minimaz configuration
 */
export async function processHTML(
    file: File,
    config: MinimazConfig
): Promise<void> {
    let result: string = file.content
    if (config.minify?.html)
        result = await minifyHTML(result)
    await outputFile(file.dest, result)
}

/**
 * Minifies HTML (Production & Development)
 * Note: Requires "html-minifier-terser" package.
 */
export async function minifyHTML(
    code: string
): Promise<string> {
    if (typeof code !== "string")
        throw new Error("[MinifyHTML] Input must be a string.")
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
            minifyJS: true,
            minifyCSS: true,
            processConditionalComments: true,
        })
    } catch (error: any) {
        throw new Error(`[MinifyHTML Failed]\n${error.message}`)
    }
}