import {
    build,
    Loader
} from "esbuild"

import {
    outputFile
} from "fs-extra"

import {
    normalize,
    resolve
} from "node:path"

import {
    runTransform
} from "../core.js"

import type {
    Bundle
} from "../types.js"

import {
    applyReplacements,
    log
} from "../../../shared/index.js"

import type {
    File
} from "../../../shared/index.js"

/**
 * Processes a JavaScript file.
 * Handles bundling by resolving imports or writes direct minified output.
 */
export async function processJS(
    file: File,
    bundle: Bundle,
    ignoredFiles: Set<string>,
    bundling: boolean,
    minifying: boolean,
    externals: Record<string, string> | undefined,
    replacements: Record<string, string> | undefined
): Promise<void> {
    // Detect CommonJS patterns - simple heuristic for developer awareness
    if (/require\s*\(|module\.exports|exports\./.test(file.content)) {
        log.warn(
            `CommonJS detected in ${file.src}. Esbuild will attempt to convert, but ESM is recommended.`
        )
    }

    if (bundling) {
        const bundled: string =
            await resolveJS(
                file,
                minifying,
                ignoredFiles,
                externals,
                replacements
            )

        bundle.chunks.push(bundled)

        await outputFile(
            file.dest,
            bundled
        )
    } else {
        let out: string =
            file.content

        if (minifying) {
            out = await minifyJS(out, true)
        }

        await outputFile(
            file.dest,
            out
        )
    }
}

/**
 * Processes a TypeScript file.
 * Transpiles TS/TSX and handles bundling logic.
 */
export async function processTS(
    file: File,
    bundle: Bundle,
    ignoredFiles: Set<string>,
    bundling: boolean,
    minifying: boolean,
    externals: Record<string, string> | undefined,
    replacements: Record<string, string> | undefined
): Promise<void> {
    const jsDest: string =
        file.dest.replace(/\.(ts|tsx)$/i, ".js")

    if (bundling) {
        const bundled: string =
            await resolveJS(
                file,
                minifying,
                ignoredFiles,
                externals,
                replacements
            )

        bundle.chunks.push(bundled)

        await outputFile(
            jsDest,
            bundled
        )
    } else {
        const loader: Loader =
            file.ext === ".tsx" ? "tsx" : "ts"

        const result: string =
            await runTransform(
                file.content,
                {
                    loader,
                    target: "es2022",
                    format: "esm",
                    minify: minifying,
                },
                "ProcessTS"
            )

        await outputFile(
            jsDest,
            result
        )
    }
}

/**
 * Resolves JS/TS dependencies using esbuild bundling engine.
 */
async function resolveJS(
    file: File,
    minify: boolean,
    ignoredFiles: Set<string>,
    externals: Record<string, string> | undefined,
    replacements: Record<string, string> | undefined
): Promise<string> {
    /**
     * Use 'stdin' to pass file.content (which already has replacements).
     * resolveDir allows esbuild to find imports relative to the original file.
     */
    const loader: Loader =
        file.ext === ".tsx" ? "tsx" :
            file.ext === ".ts" ? "ts" : "js"

    const result = await build({
        stdin: {
            contents: file.content,
            resolveDir: resolve(file.src, ".."),
            loader: loader,
            sourcefile: file.src
        },
        bundle: true,
        write: false,
        metafile: true,
        format: "esm",
        platform: "browser",
        target: "es2022",
        minify: minify,
        splitting: false,
        treeShaking: true,
        mainFields: ["module", "main"],
        conditions: ["import", "browser"],
        footer: { js: "" },
        legalComments: "none",
    })

    let bundledCode: string =
        result.outputFiles[0]?.text ?? ""

    /**
     * Post-Bundle Replacement:
     * Catch replacements in dependencies pulled raw from disk during bundling.
     */
    if (replacements) {
        bundledCode = applyReplacements(
            bundledCode,
            replacements
        )
    }

    /**
     * CLEANUP:
     * Restore original intended paths if esbuild added relative prefixes to replacements.
     */
    if (externals) {
        for (const destination of Object.values(externals)) {
            if (destination.startsWith("/")) {
                const escapedDest: string =
                    destination.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

                const regex: RegExp =
                    new RegExp(`(\\.\\.\\/|\\.\\/)+${escapedDest}`, 'g')

                bundledCode =
                    bundledCode.replace(regex, destination)
            }
        }
    }

    // Dependency Discovery
    if (result.metafile) {
        const entryPath: string =
            normalize(resolve(file.src))

        for (const inputPath of Object.keys(result.metafile.inputs)) {
            const absoluteInputPath: string =
                normalize(resolve(inputPath))

            if (absoluteInputPath !== entryPath) {
                ignoredFiles.add(absoluteInputPath)
            }
        }
    }

    return bundledCode
}

/**
 * Minifies JavaScript (Production & Development)
 */
export async function minifyJS(
    code: string,
    minify: boolean = true
): Promise<string> {
    return runTransform(code, {
        loader: "js",
        format: "esm",
        minify: minify,
        treeShaking: true,
        sourcemap: false,
        legalComments: "none",
        target: "es2022",
        pure: [
            "console.log",
            "console.debug"
        ],
    }, "MinifyJS")
}