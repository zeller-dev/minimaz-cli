import {
    build,
    Loader
} from "esbuild"

import {
    outputFile
} from "fs-extra"

import {
    resolve
} from "node:path"

import {
    runTransform
} from "../index.js"

import {
    log,
    Bundle,
    File
} from "../../../index.js"

/**
 * Processes a JavaScript file.
 * Handles bundling by resolving imports or writes direct minified output.
 */
export async function processJS(
    file: File,
    bundle: Bundle,
    bundling: boolean,
    minifying: boolean,
    ignoredFiles: Set<string>
): Promise<void> {
    // Detect CommonJS patterns
    if (/require\s*\(|module\.exports|exports\./.test(file.content))
        log(
            "warn",
            `CommonJS detected in ${file.src}. Consider ESM.`
        )


    if (bundling) {
        const bundled: string =
            await resolveJS(file, minifying, ignoredFiles)
        bundle.chunks.push(bundled)
    } else {
        let out: string = file.content
        if (minifying) {
            out = await minifyJS(out, true)
        }
        await outputFile(file.dest, out)
    }
}

/**
 * Processes a TypeScript file.
 * Transpiles TS/TSX and handles bundling logic.
 */
export async function processTS(
    file: File,
    bundle: Bundle,
    bundling: boolean,
    minifying: boolean,
    ignoredFiles: Set<string>
): Promise<void> {
    const jsDest: string = file.dest.replace(/\.(ts|tsx)$/i, ".js")
    if (bundling) {
        const bundled: string =
            await resolveJS(file, minifying, ignoredFiles)
        bundle.chunks.push(bundled)
    } else {
        const loader: Loader = file.ext === ".ts" ? "ts" : "tsx"
        const result = await runTransform(file.content, {
            loader,
            target: "es2020",
            format: "esm",
            minify: minifying,
        }, "ProcessTS")
        await outputFile(jsDest, result)
    }
}

/**
 * Resolves JS/TS dependencies using esbuild bundling engine.
 * Populates the ignoredFiles Set with discovered dependencies.
 */
async function resolveJS(
    file: File,
    isProd: boolean,
    ignoredFiles: Set<string>
): Promise<string> {
    const result = await build({
        entryPoints: [file.src],
        bundle: true,
        write: false,
        metafile: true, // Enable metafile to track dependencies
        format: "esm",
        minify: isProd,
        target: isProd ? "es2020" : "esnext",
        define: {
            "process.env.NODE_ENV": isProd ? '"production"' : '"development"',
            "DEBUG": isProd ? "false" : "true"
        }
    })
    // Extract all input files from the metafile and add them to ignoredFiles
    if (result.metafile) {
        const entryPath = resolve(file.src)
        for (
            const inputPath
            of Object.keys(result.metafile.inputs)
        ) {
            const absoluteInputPath = resolve(inputPath)            // Skip the entry point itself so it does not ignore its own processing
            if (absoluteInputPath !== entryPath) {
                ignoredFiles.add(absoluteInputPath)
            }
        }
    }

    return result.outputFiles[0].text
}

/**
 * Minifies JavaScript (Production & Development)
 */
export async function minifyJS(
    code: string,
    isProd: boolean = true
): Promise<string> {
    return runTransform(code, {
        loader: "js",
        format: "esm",
        minify: isProd,
        treeShaking: isProd,
        sourcemap: !isProd ? "inline" : false,
        legalComments: isProd ? "none" : "inline",
        target: isProd ? "es2020" : "esnext",
        pure: isProd ? ["console.log", "console.debug"] : [],
        define: {
            "process.env.NODE_ENV": isProd ? '"production"' : '"development"',
            "DEBUG": isProd ? "false" : "true"
        },
    }, "MinifyJS")
}