import {
    build
} from "esbuild"

import {
    outputFile
} from "fs-extra"

import {
    normalize,
    resolve
} from "node:path"

import {
    applyReplacements,
    log
} from "../../../shared/index.js"

import type {
    File
} from "../../../shared/index.js"

import {
    runTransform,
} from "../core.js"

import type {
    Bundle
} from "../types.js"

/**
 * Processes a CSS file.
 * Bundles CSS and ensures all bundled content has replacements applied.
 */
export async function processCSS(
    file: File,
    bundle: Bundle,
    ignoredFiles: Set<string>,
    bundling: boolean,
    minifying: boolean,
    externals: Record<string, string> | undefined,
    replacements: Record<string, string> | undefined
): Promise<void> {
    log.debug(
        `Processing CSS: ${file.src}`
    )

    if (bundling) {
        /**
         * We use 'stdin' to pass the file.content which already has replacements.
         * resolveDir ensures relative @imports still work.
         */
        const result = await build({
            stdin: {
                contents: file.content,
                resolveDir: resolve(file.src, ".."),
                loader: "css",
                sourcefile: file.src
            },
            bundle: true,
            write: false,
            metafile: true,
            minify: minifying,
            charset: "utf8",
            legalComments: "none",
            external: [
                "*.woff",
                "*.woff2",
                "*.ttf",
                "*.otf",
                "*.eot",
                "*.svg",
                "*.png",
                "*.jpg",
                "*.jpeg",
                "*.gif",
                "*.webp"
            ],
            target: [
                "chrome80",
                "safari13",
                "firefox70",
                "edge79"
            ]
        })

        let bundledCode: string =
            result.outputFiles[0]?.text ?? ""

        /**
         * 1. Post-Bundle Replacement:
         * Dependencies pulled from disk by esbuild are raw.
         * We apply replacements here to catch everything in the final chunk.
         */
        if (replacements) {
            bundledCode = applyReplacements(
                bundledCode,
                replacements
            )
        }

        /**
         * 2. CLEANUP:
         * Strip relative prefixes from external paths to respect original intent.
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

        bundle.chunks.push(bundledCode)

        await outputFile(
            file.dest,
            bundledCode
        )
    } else {
        let out: string =
            file.content

        if (minifying) {
            out = await minifyCSS(out)
        }

        await outputFile(
            file.dest,
            out
        )
    }
}

/**
 * Minifies CSS (Production & Development)
 */
export async function minifyCSS(
    code: string
): Promise<string> {
    return runTransform(code, {
        loader: "css",
        minify: true,
        charset: "utf8",
        sourcemap: false,
        legalComments: "none",
        target: [
            "chrome80",
            "safari13",
            "firefox70",
            "edge79"
        ]
    }, "MinifyCSS")
}