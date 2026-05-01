import {
    Loader,
    transform
} from "esbuild"

import {
    minify
} from "html-minifier-terser"

import {
    // --- FUNCTIONS ---
    log
} from "../../index.js"

/**
 * Validates JS, TS, and CSS using esbuild.
 */
export async function validateWithEsbuild(
    filePath: string,
    content: string, ext: string
): Promise<void> {
    try {
        const loader = (
            ext === ".css"
                ? "css"
                : (ext.includes("ts")
                    ? "ts"
                    : "js"
                )
        ) as Loader

        await transform(
            content,
            {
                loader,
                format: "esm",
                logLevel: "silent",
            }
        )

        log("success", `${loader.toUpperCase()} Valid: ${filePath}`)
    } catch (error: any) {
        log("error", `Syntax Error in ${filePath}:`)

        // Handle esbuild-specific error formatting
        if (error.errors)
            error.errors.forEach((err: any) => {
                const line = err.location?.line ?? "??"
                log("error", `   -> Line ${line}: ${err.text}`)
            })
    }
}

/**
 * Validates HTML via html-minifier-terser.
 */
export async function validateHTML(
    filePath: string,
    content: string
): Promise<void> {
    try {
        await minify(content, {
            continueOnParseError: false,
            caseSensitive: true
        })
        log("success", `HTML Valid: ${filePath}`)
    } catch (error: any) {
        log("error", `HTML Error [${filePath}]: ${error.message}`)
    }
}