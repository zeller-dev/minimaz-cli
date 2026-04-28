#!/usr/bin/env node
import esbuild from 'esbuild'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const destFolderName = './dist'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const outDir = path.join(__dirname, destFolderName)
const pkgPath = path.join(__dirname, 'package.json') // Added this global constant

/* ======================
    Logging
====================== */

const COLORS = {
    reset: '\x1b[0m',
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warn: '\x1b[33m',    // Yellow
    error: '\x1b[31m',   // Red
    debug: '\x1b[35m',   // Magenta
    dim: '\x1b[2m'       // Dim/Gray
}

function formatTs() {
    const date = new Date()
    const pad = n => n.toString().padStart(2, '0')
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const h = pad(date.getHours())
    const min = pad(date.getMinutes())
    const s = pad(date.getSeconds())
    return `${COLORS.dim}${y}-${m}-${d} ${h}:${min}:${s}${COLORS.reset}`
}

function log(type = 'info', message) {
    if (type === 'debug' && process.env.NODE_ENV !== 'development') return

    const PREFIXES = {
        info:
            '[ --- INFO ------]',
        success:
            '[ --- SUCCESS ---]',
        warn:
            '[ --- WARN ------]',
        error:
            '[ --- ERROR -----]',
        debug:
            '[ --- DEBUG -----]'
    }

    const logger = {
        warn: console.warn,
        error: console.error,
        debug: console.debug
    }[type] || console.log

    const color = COLORS[type] || COLORS.reset
    const prefix = `${color}${PREFIXES[type]}${COLORS.reset}`
    const timestamp = formatTs()

    logger(`[${timestamp}] ${prefix} ${message}`)
}

/* ======================
    Validation
====================== */

async function validatePackageJson(path) {
    log('debug', 'Package.json: validating')
    if (!(await fs.pathExists(path)))
        throw new Error(`package.json not found at: ${path}`)

    try {
        const pkg = await fs.readJson(path)
        const missingFields = []
        if (!pkg.name)
            missingFields.push('name')
        if (!pkg.version)
            missingFields.push('version')
        if (!pkg.bin || typeof pkg.bin !== 'object')
            missingFields.push('bin')

        if (missingFields.length > 0)
            throw new Error(
                `Missing required fields: ${missingFields.join(', ')}`
            )

        if (!pkg.bin.minimaz || !pkg.bin.mz)
            throw new Error(
                'bin must include both "minimaz" and "mz"'
            )

        log('debug', 'Package.json: valid')
        return pkg
    } catch (err) {
        throw new Error(`Validation failed: ${err.message}`)
    }
}

/* ======================
    Dist & Templates
====================== */
async function handleDistFolder() {
    log('debug', `Destination folder: Cleaning and re-creating ${destFolderName}`)
    await fs.remove(outDir)
    await fs.mkdir(path.join(outDir, 'bin'), { recursive: true })
}

async function handleTemplatesFolder() {
    const templatesSrc = path.join(__dirname, 'src', 'templates')
    const templatesDest = path.join(outDir, 'templates')

    if (await fs.pathExists(templatesSrc)) {
        log('debug', `Templates: ./src/templates exists, copying to ${destFolderName}`)
        await fs.copy(templatesSrc, templatesDest)
    } else {
        log('warn', `Templates: ./src/templates does not exist`)
    }
}

/* ======================
    Build
====================== */

async function build() {
    log('info', 'Starting build process...')

    // --- Destination Folder --- /
    await handleDistFolder()

    // --- Package.json --- //
    const pkg = await validatePackageJson(pkgPath)

    const externalDeps = [
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.devDependencies ?? {}),
        'fs', 'path', 'os', 'child_process', 'fs-extra'
    ].filter(Boolean)


    log('debug', 'Package.json: creating minimal version')
    const { bin, ...rest } = pkg
    const removeDist = p => p.replace(/^dist[\\/]/, '')

    delete rest.devDependencies
    delete rest.scripts

    const minimalPkg = {
        ...rest,
        bin: {
            minimaz: removeDist(bin.minimaz),
            mz: removeDist(bin.mz),
        },
        postinstall: pkg.postinstall
            ? removeDist(pkg.postinstall)
            : undefined,
        dependencies: externalDeps.reduce((acc, dep) => {
            if (pkg.dependencies && pkg.dependencies[dep])
                acc[dep] = pkg.dependencies[dep]
            return acc
        }, {})
    }

    log('debug', 'Package.json: writing on file')
    await fs.writeJson(
        path.join(outDir, 'package.json'),
        minimalPkg,
        { spaces: 2 }
    )

    // --- EsBuild --- //
    log('debug', 'EsBuild: building')
    await esbuild.build({
        entryPoints: [path.join(__dirname, 'bin/cli.ts')],
        bundle: true,
        minify: true,
        platform: 'node',
        target: 'node18',
        format: 'esm',
        outfile: path.join(outDir, 'bin/cli.js'),
        external: externalDeps,
        treeShaking: true,
        sourcemap: false
    })

    // --- Templates --- //
    await handleTemplatesFolder()

    // --- Files to copy --- //
    const filesToCopy = ['README.md', 'LICENSE']
    log('debug', `Files to copy: ${filesToCopy.join(', ')}`)
    for (const file of filesToCopy) {
        const src = path.join(__dirname, file)
        const dest = path.join(outDir, file)
        if (await fs.pathExists(src)) {
            log('debug', `Files to copy: ${file} exists, copying to ${destFolderName}`)
            await fs.copy(src, dest)
        } else {
            log('warn', `Files to copy: ${file} does not exists, skipping copy.`)
        }
    }

    log('success', 'Build completed successfully!')
}

build().catch(err => {
    log('error', `Build failed: ${err.message}`)
    process.exit(1)
})