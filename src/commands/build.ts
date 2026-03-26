import fs from 'fs-extra'
import path from 'path'
import CleanCSS from 'clean-css'
import { minify as minifyHtml } from 'html-minifier-terser'
import { minify as minifyJs } from 'terser'
import { transform, build as jsBuild, Loader } from 'esbuild'

import {
    loadConfig, log, applyReplacements, getFile, removeDistDir, resolveCurrentPath, // utils
    MinimazConfig, Bundles, File,                                                    // types
    getDirElements
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
    const currentDirPath: string = resolveCurrentPath()
    const distDirPath: string = path.resolve(currentDirPath, config.outDir)

    await removeDistDir(distDirPath)      // Clean dist directory
    await fs.ensureDir(distDirPath)       // Recreate dist directory

    if (!config.folders || Object.keys(config.folders).length === 0) {
        log('warn', 'No folders defined in config. Nothing to build.')
        return
    }

    for (const [from, to] of Object.entries(config.folders)) {
        log('debug', `Building folder: ${from} -> /${to}`)
        await processFolder(from, to, config, distDirPath)
    }

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
 * @param distDir - Absolute dist directory path
 */
async function processFolder(
    srcName: string,
    destName: string,
    config: MinimazConfig,
    distDir: string
): Promise<void> {
    const fullSrc: string = resolveCurrentPath([srcName])
    const fullDest: string = path.join(distDir, destName)

    if (!(await fs.pathExists(fullSrc))) {
        log('warn', `Folder not found: ${srcName}`)
        return
    }

    const bundles: Bundles = { css: [], js: [] }

    await walkFolder(fullSrc, fullDest, config, bundles)

    // Merge CSS/JS bundles only for the root source folder
    if (srcName === process.env.CLI_WORKDIR) {
        log('debug', 'Working on the root dir, adding external script, styles and bundles')
        await mergeRootAssets(bundles, config, distDir)
    }

    log('success', `Processed folder: ${srcName} -> /${destName}`)
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
    src: string,
    dest: string,
    config: MinimazConfig,
    bundles: Bundles
): Promise<void> {
    await fs.ensureDir(dest)

    for (const item of await getDirElements(src)) {
        const srcPath: string = path.join(src, item)
        const destPath: string = path.join(dest, item)
        const stat: fs.Stats = await fs.stat(srcPath)

        log('debug', `Found ${stat.isDirectory() ? 'DIRECTORY' : 'FILE'}: ${item}`)

        if (stat.isDirectory()) {
            await walkFolder(srcPath, destPath, config, bundles)
            continue
        }
        const fileContent: string = await getFile(srcPath, config.replace)
        if (fileContent.length > 0) {
            const fileExt: string = path.extname(srcPath).toLowerCase();
            await processFile(
                { src: srcPath, dest: destPath, content: fileContent, ext: fileExt },
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
            await copyToDist(file)
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
 * Merges and writes root-level CSS and JS bundles.
 *
 * @param cssChunks - Collected CSS content
 * @param jsChunks - Collected JS content
 * @param config - Minimaz configuration
 * @param distDir - Absolute dist directory path
 */
async function mergeRootAssets(
    bundles: Bundles,
    config: MinimazConfig,
    distDir: string
): Promise<void> {
    const bundleDir = getBundleOutDir(config, distDir)
    await fs.ensureDir(bundleDir)

    // Write bundles if enabled
    if (config.bundling?.css) await writeCssBundle(bundles.css, config, bundleDir)
    if (config.bundling?.js) await writeJsBundle(bundles.js, config, bundleDir)
}

/*
async function handleExternal(config: MinimazConfig, bundles: Bundles): Promise<void> {
  // External assets


  await appendExternalAssets(config.styles, bundles.css, config, 'css', !!config.bundling?.css, bundleDir)
  await appendExternalAssets(config.scripts, bundles.js, config, 'js', !!config.bundling?.js, bundleDir)
}
  */
/**
 * Appends external CSS or JS files to the given chunk accumulator.
 *
 * @param files - List of file paths
 * @param target - Target accumulator
 * @param config - Minimaz configuration
 */
async function processExternals(
    externals: string[],
    target: string[],
    bundles: Bundles,
    config: MinimazConfig
): Promise<void> {
    log('info', 'Processing externals...')

    /* this should take the path in the external,
    process it with processFolder if it's a folder
    or processFile if it's a file
    */

    for (const external of externals) {

    }

    for (const f of externals) {
        const fullPath: string = resolveCurrentPath([f])

        if (!(await fs.pathExists(fullPath))) {
            log('warn', `File not found: ${f} `)
            continue
        }

        const ext: string = path.extname(fullPath).toLowerCase();
        const content: string = await getFile(fullPath, config.replace)


        await processFile({ src: fullPath, dest: f, content: content, ext: ext }, config, bundles)
    }
}

/**
 * Writes the final CSS bundle to disk.
 *
 * @param chunks - CSS chunks
 * @param config - Minimaz configuration
 * @param distDir - Absolute dist directory path
 */
async function writeCssBundle(
    chunks: string[],
    config: MinimazConfig,
    distDir: string
): Promise<void> {
    if (!chunks.length) return
    let css: string = chunks.join('')
    if (config.minify?.css) {
        const output = new CleanCSS().minify(css)
        if (output.warnings.length)
            output.warnings.forEach(w => log('warn', w))
        css = output.styles
    }
    await fs.outputFile(path.join(distDir, 'style.css'), css)
}

/**
 * Writes the final JS bundle to disk using esbuild.
 *
 * @param chunks - JS/TS chunks collected from the build
 * @param config - Minimaz configuration
 * @param distDir - Absolute dist directory path
 */
async function writeJsBundle(
    chunks: string[],
    config: MinimazConfig,
    distDir: string
): Promise<void> {
    if (!chunks.length) return

    try {
        const result = await jsBuild({
            stdin: {
                contents: chunks.join('\n'),
                resolveDir: distDir,
                loader: 'js',
                sourcefile: 'bundle.js'
            },
            bundle: true,
            format: 'esm',
            minify: !!config.minify?.js,
            sourcemap: false,
            write: false
        })

        await fs.outputFile(path.join(distDir, 'script.js'), result.outputFiles[0].text)
        log('success', `JS bundle written to /${distDir}/script.js`)
    } catch (err) {
        log('warn', `ESBuild JS bundle failed: ${err}`)
    }
}

async function copyToDist(
    file: File
): Promise<void> {
    await fs.outputFile(file.dest, file.content)
}

function getBundleOutDir(config: MinimazConfig, distDir: string) {
    // If outDir is empty string or undefined, return the distDir itself
    return config.bundling?.outDir ? path.join(distDir, config.bundling.outDir) : distDir
}