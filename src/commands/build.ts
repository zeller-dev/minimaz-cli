import fs from 'fs-extra'
import path from 'node:path'

import {
    minify as minifyHtml
} from 'html-minifier-terser'

import {
    transform, build as esbuild, Loader
} from 'esbuild'

import {
    // --- FUNCTIONS ---
    getDirElements, getFile, loadConfig, log, removeOutDir, resolveCurrentPath,

    // --- TYPES ---
    Bundles, File, MinimazConfig
} from '../index.js'

/**
 * Builds the project according to the Minimaz configuration.
 *
 * - Cleans and prepares the dist directory
 * - Processes configured source folders
 * - Merges and minifies CSS/JS assets when required
 */
export async function build(): Promise<void> {
    const config: MinimazConfig = await loadConfig() // Load project config
    const outDirPath: string = path.resolve(resolveCurrentPath(), config.outDir)

    await removeOutDir(outDirPath)      // Clean dist directory
    await fs.ensureDir(outDirPath)       // Recreate dist directory

    // Bundles
    const bundles: Bundles = { outDir: getBundleOutDir(config, outDirPath), css: [], js: [] }
    await fs.ensureDir(bundles.outDir)

    if (!config.folders || Object.keys(config.folders).length === 0) {
        log('warn', 'No folders defined in config. Nothing to build.')
        return
    }

    for (const [from, to] of Object.entries(config.folders)) {
        log('debug', `Building folder: ${from} -> /${to}`)
        await processFolder(
            resolveCurrentPath([from]),
            path.join(outDirPath, to),
            config,
            bundles
        )
    }

    // process externals
    if (config.styles?.length)
        await processExternals(outDirPath, config.styles, bundles, config)

    if (config.scripts?.length)
        await processExternals(outDirPath, config.scripts, bundles, config)

    // Write bundles if enabled
    if (config.bundling?.css)
        await writeCssBundle(bundles.css, !!config.minify?.css, bundles.outDir)
    if (config.bundling?.js)
        await writeJsBundle(bundles.js, !!config.minify?.js, bundles.outDir)

    log('success', `Build completed. Output saved in /${config.outDir}`)
}

/**
 * Processes a single source folder.
 *
 * - Walks the directory recursively
 * - Collects CSS and JS chunks
 * - Merges root assets if required
 *
 * @param srcPathRel - Source folder relative path
 * @param destName - Destination folder name inside dist
 * @param config - Minimaz configuration
 * @param outDir - Absolute dist directory path
 */
async function processFolder(
    from: string,
    to: string,
    config: MinimazConfig,
    bundles: Bundles
): Promise<void> {

    if (!(await fs.pathExists(from))) {
        log('warn', `Folder not found: ${from}`)
        return
    }

    await walkFolder(from, to, config, bundles)

    log('success', `Processed folder: ${from} -> /${to}`)
}

/**
 * Recursively walks a directory and processes its files.
 *
 * @param src - Source directory path
 * @param dest - Destination directory path
 * @param config - Minimaz configuration
 * @param cssChunks - Accumulator for CSS content
 * @param jsChunks - Accumulator for JS content
 */
async function walkFolder(
    from: string,
    to: string,
    config: MinimazConfig,
    bundles: Bundles
): Promise<void> {
    await fs.ensureDir(to)

    for (const item of await getDirElements(from)) {
        const fromPath: string = path.join(from, item)
        const toPath: string = path.join(to, item)
        const stat: fs.Stats = await fs.stat(fromPath)

        log('debug', `Found ${stat.isDirectory() ? 'DIRECTORY' : 'FILE'}: ${item}`)

        if (stat.isDirectory()) {
            await walkFolder(fromPath, toPath, config, bundles)
            continue
        }
        const fileContent: string = await getFile(fromPath, config.replace)
        if (fileContent.length > 0) {
            const fileExt: string = path.extname(fromPath).toLowerCase();
            await processFile(
                { src: fromPath, dest: toPath, content: fileContent, ext: fileExt },
                config,
                bundles
            )
        }
    }
}

/**
 * Processes a single file based on its extension.
 *
 * @param file
 * @param config - Minimaz configuration
 * @param bundles
 */
async function processFile(
    file: File,
    config: MinimazConfig,
    bundles: Bundles
): Promise<void> {
    log('debug', `Processing file: ${file.src}`)

    switch (file.ext) {
        case '.html':
            await processHtml(file, config)
            break

        case '.css': {
            await processCSS(file, bundles.css, !!config.bundling?.css, !!config.minify?.css)
            break
        }

        case '.js': {
            await processJS(file, bundles.js, !!config.bundling?.js, !!config.minify?.js)
            break
        }
        case '.tsx':
        case '.ts': {
            await processTS(file, bundles.js, !!config.bundling?.js, !!config.minify?.js)
            break
        }

        default:
            await fs.copy(file.src, file.dest)
    }
}

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
async function processHtml(file: File, config: MinimazConfig): Promise<void> {
    const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi
    let result = file.content; // Start with original content

    // 1. Minify Inline Scripts
    const matches = Array.from(result.matchAll(scriptRegex));
    for (const match of matches) {
        const [fullMatch, attrs, code] = match;
        if (/src=/i.test(attrs) || !code.trim()) continue;

        const typeAttr = (attrs.match(/type=["']([^"']+)["']/i)?.[1] || '').toLowerCase();
        const isModule = /module/i.test(typeAttr);

        if (typeAttr === '' || typeAttr === 'text/javascript' || isModule) {
            try {
                const { code: minified } = await transform(code, {
                    minify: true,
                    format: isModule ? 'esm' : 'iife'
                });
                // Replace the specific fullMatch in the result
                result = result.replace(fullMatch, `<script${attrs}>${minified.trim()}</script>`);
            } catch (err) {
                log('warn', `JS minify error in ${file.src}`);
            }
        }
    }

    // 2. Final HTML Minification
    if (config.minify?.html) {
        result = await minifyHtml(result, {
            collapseWhitespace: true,
            removeComments: true,
            minifyCSS: async (text: string) => {
                const { code } = await transform(text, { loader: 'css', minify: true });
                return code;
            },
            minifyJS: false, // Already handled manually above
        })
    }

    await fs.outputFile(file.dest, result)
}

/**
 * Processes a CSS file
 *
 * @param file
 * @param config
 * @param bundle
 */
async function processCSS(
    file: File,
    bundle: string[],
    bundling: boolean,
    minifying: boolean
): Promise<void> {
    if (bundling) {
        bundle.push(file.content);
    } else {
        let out: string = file.content;
        if (minifying) {
            const result = await transform(out, {
                loader: 'css',
                minify: true
            });
            out = result.code;
        }
        await fs.outputFile(file.dest, out);
    }
}

/**
 * Processes a JavaScript file:
 *
 * @param file
 * @param config
 * @param bundle
 */
async function processJS(
    file: File,
    bundle: string[],
    bundling: boolean,
    minifying: boolean
): Promise<void> {
    if (/require\s*\(|module\.exports|exports\./.test(file.content))
        log('warn', `CommonJS detected in ${file.src}. Consider ESM.`)

    let out = file.content;

    // Use esbuild instead of the missing minifyJs (terser)
    if (minifying && !bundling) {
        const result = await transform(out, { minify: true, target: 'es2020' });
        out = result.code;
    }

    if (bundling) {
        bundle.push(out);
    } else {
        await fs.outputFile(file.dest, out);
    }
}

/**
 * Processes a TypeScript file:
 *
 * - Transpiles TypeScript to JavaScript using esbuild
 * - Does not perform type-checking (handled separately in dev)
 * - Outputs ES module JavaScript targeting ES2020
 * - Adds result to JS bundle or writes it directly to disk
 *
 * @param file
 * @param config - Minimaz configuration
 * @param jsBundle - Accumulator for JS bundle content
 */
async function processTS(
    file: File,
    bundle: string[],
    bundling: boolean,
    minifying: boolean
): Promise<void> {

    // Detect CommonJS patterns in TS
    if (/require\s*\(|module\.exports|exports\./.test(file.content))
        log('warn', `CommonJS detected in ${file.src}, consider converting to ESM`)

    const loader: Loader = file.ext === '.ts' ? 'ts' : 'tsx';

    // Compile TS to JS using esbuild
    const result = await transform(file.content, {
        loader,
        target: 'es2020',
        format: 'esm',
        sourcemap: false,
    })

    const jsContent: string = result.code

    // Reuse processJS for further handling
    const jsDest: string = file.dest.replace(/\.(ts|tsx)$/i, '.js')

    await processJS(
        { src: file.src, dest: jsDest, content: jsContent, ext: 'js' },
        bundle,
        bundling,
        minifying
    )
}

/**
 * Processes external CSS/JS resources.
 *
 * - If path is a folder → processes it recursively (like a normal folder)
 * - If path is a file → processes it as a single file
 *
 * @param externals - List of external paths (files or folders)
 * @param bundles - Bundles accumulator
 * @param config - Minimaz configuration
 * @param outDir - Output directory
 */
async function processExternals(
    outDirPath: string,
    externals: string[],
    bundles: Bundles,
    config: MinimazConfig
): Promise<void> {
    log('info', 'Processing externals...')

    for (const external of externals) {
        const fullPath = resolveCurrentPath([external])

        if (!(await fs.pathExists(fullPath))) {
            log('warn', `External not found: ${external}`)
            continue
        }

        const stat = await fs.stat(fullPath)

        // If it's a directory → process like a normal folder
        if (stat.isDirectory()) {
            log('debug', `Processing external folder: ${external}`)
            await walkFolder(fullPath, outDirPath, config, bundles)
            continue
        }

        // If it's a file → process like a normal file
        log('debug', `Processing external file: ${external}`)

        const ext: string = path.extname(fullPath).toLowerCase()
        const content: string = await getFile(fullPath, config.replace)

        await processFile(
            {
                src: fullPath,
                dest: path.join(bundles.outDir, path.basename(fullPath)),
                content,
                ext
            },
            config,
            bundles
        )
    }
}

/**
 * Writes the final CSS bundle to disk.
 *
 * @param chunks - CSS chunks
 * @param config - Minimaz configuration
 * @param outDir - Absolute dist directory path
 */
async function writeCssBundle(chunks: string[], minify: boolean, outDir: string): Promise<void> {
    if (!chunks.length) return;
    let css = chunks.join('\n');

    if (minify) {
        const result = await transform(css, { loader: 'css', minify: true });
        css = result.code;
    }

    await fs.outputFile(path.join(outDir, 'style.css'), css);
}

/**
 * Writes the final JS bundle to disk using esbuild.
 *
 * @param chunks - JS/TS chunks collected from the build
 * @param config - Minimaz configuration
 * @param outDir - Absolute dist directory path
 */
async function writeJsBundle(chunks: string[], minify: boolean, outDir: string): Promise<void> {
    if (!chunks.length) return

    try {
        const result = await esbuild({ // Explicitly call .build
            stdin: {
                contents: chunks.join('\n'),
                resolveDir: process.cwd(),
                loader: 'js',
            },
            bundle: true,
            format: 'esm',
            minify: minify,
            write: false,
        })

        await fs.outputFile(path.join(outDir, 'script.js'), result.outputFiles[0].text)
        log('success', `JS bundle written to /${outDir}/script.js`)
    } catch (err) {
        log('warn', `ESBuild JS bundle failed: ${err}`)
    }
}

function getBundleOutDir(config: MinimazConfig, outDir: string) {
    // If outDir is empty string or undefined, return the outDir itself
    return config.bundling?.outDir
        ? path.join(outDir, config.bundling.outDir)
        : outDir
}