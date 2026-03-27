import fs from 'fs-extra'
import path from 'path'
import CleanCSS from 'clean-css'
import { minify as minifyHtml } from 'html-minifier-terser'
import { minify as minifyJs } from 'terser'
import { transform, build as jsBuild, Loader } from 'esbuild'

import {
    loadConfig, log, getFile, removeOutDir, resolveCurrentPath, getDirElements, // utils
    MinimazConfig, Bundles, File                                                // types

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
async function processHtml(
    file: File,
    config: MinimazConfig
): Promise<void> {
    const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi

    let lastIndex = 0
    let result = ''
    let match: RegExpExecArray | null

    while ((match = scriptRegex.exec(file.content)) !== null) {
        const [fullMatch, attrs, code] = match

        result += file.content.slice(lastIndex, match.index)
        lastIndex = match.index + fullMatch.length

        if (/src=/i.test(attrs)) {
            result += fullMatch
            continue
        }

        const typeAttr = (attrs.match(/type=["']([^"']+)["']/i)?.[1] || '').toLowerCase()
        const isModule = /module/i.test(typeAttr)
        const isNoModule = /nomodule/i.test(attrs)

        if (typeAttr === 'application/json') {
            try {
                // Minify JSON: parse and stringify compact
                const minJson = JSON.stringify(JSON.parse(code))
                result += `<script${attrs}>${minJson}</script>`
            } catch (err) {
                log('warn', `Invalid JSON in ${file.src}: ${err}`)
                result += fullMatch
            }
        } else if (typeAttr === '' || typeAttr === 'text/javascript' || isModule || isNoModule) {
            try {
                // Minify inline JS safely
                const minJs = await minifyJs(code, { format: { semicolons: true }, module: isModule })
                result += `<script${attrs}>${minJs.code || ''}</script>`
            } catch (err) {
                log('warn', `JS minify error in ${file.src}: ${err}`)
                result += fullMatch
            }
        } else {
            result += fullMatch
        }
    }

    // Append remaining HTML
    result += file.content.slice(lastIndex)

    // Minify final HTML + inline CSS if configured
    if (config.minify?.html) {
        result = await minifyHtml(result, {
            collapseWhitespace: true,
            removeComments: true,
            minifyCSS: config.minify.css,
            minifyJS: false, // already minified above
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
        bundle.push(file.content)
    } else {
        let out = file.content
        if (minifying) {
            const min = new CleanCSS().minify(file.content)
            if (min.warnings.length) min.warnings.forEach(w => log('warn', w))
            out = min.styles
        }
        await fs.outputFile(file.dest, out)
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

    // Detect CommonJS patterns
    if (/require\s*\(|module\.exports|exports\./.test(file.content))
        log('warn', `CommonJS detected consider converting to ESM`)

    if (bundling) {
        bundle.push(file.content)
    } else {
        let out = file.content
        if (minifying) out = (await minifyJs(out)).code ?? ''
        await fs.outputFile(file.dest, out)
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

    const jsContent = result.code

    // Reuse processJS for further handling
    const jsDest = file.dest.replace(/\.(ts|tsx)$/i, '.js')

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
async function writeCssBundle(
    chunks: string[],
    minify: boolean,
    outDir: string
): Promise<void> {
    if (!chunks.length) return
    let css: string = chunks.join('')
    if (minify) {
        const output = new CleanCSS().minify(css)
        if (output.warnings.length)
            output.warnings.forEach(w => log('warn', w))
        css = output.styles
    }
    await fs.outputFile(path.join(outDir, 'style.css'), css)
}

/**
 * Writes the final JS bundle to disk using esbuild.
 *
 * @param chunks - JS/TS chunks collected from the build
 * @param config - Minimaz configuration
 * @param outDir - Absolute dist directory path
 */
async function writeJsBundle(
    chunks: string[],
    minify: boolean,
    outDir: string
): Promise<void> {
    if (!chunks.length) return

    try {
        const result = await jsBuild({
            stdin: {
                contents: chunks.join('\n'),
                resolveDir: outDir,
                loader: 'js',
                sourcefile: 'bundle.js'
            },
            bundle: true,
            format: 'esm',
            minify: minify,
            sourcemap: false,
            write: false
        })

        await fs.outputFile(path.join(outDir, 'script.js'), result.outputFiles[0].text)
        log('success', `JS bundle written to /${outDir}/script.js`)
    } catch (err) {
        log('warn', `ESBuild JS bundle failed: ${err}`)
    }
}

async function copyToDist(
    file: File
): Promise<void> {
    log('debug', `Creating ${file.dest}`)
    await fs.outputFile(file.dest, file.content)
}

function getBundleOutDir(config: MinimazConfig, outDir: string) {
    // If outDir is empty string or undefined, return the outDir itself
    return config.bundling?.outDir ? path.join(outDir, config.bundling.outDir) : outDir
}