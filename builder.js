#!/usr/bin/env node
import {
    build as esBuild
} from "esbuild"

import {
    cp, mkdir, readFile, rm, stat, writeFile
} from 'node:fs/promises'

import {
    dirname, join
} from "node:path"

import {
    fileURLToPath
} from "node:url"

const destFolderName = "./dist"

const __dirname =
    dirname(fileURLToPath(import.meta.url))
const outDir =
    join(__dirname, destFolderName)
const pkgPath =
    join(__dirname, "package.json")

/* ======================
    Logging
====================== */

const COLORS = {
    reset:
        "\x1b[0m",
    info:
        "\x1b[36m",     // Cyan
    success:
        "\x1b[32m",     // Green
    warn:
        "\x1b[33m",     // Yellow
    error:
        "\x1b[31m",     // Red
    debug:
        "\x1b[35m",     // Magenta
    dim:
        "\x1b[2m"       // Dim/Gray
}

function formatTs() {
    const date = new Date()
    const pad = n => n.toString().padStart(2, "0")
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const h = pad(date.getHours())
    const min = pad(date.getMinutes())
    const s = pad(date.getSeconds())
    return `${COLORS.dim}${y}-${m}-${d} ${h}:${min}:${s}${COLORS.reset}`
}

function log(type = "info", message) {
    if (
        type === "debug"
        && process.env.NODE_ENV !== "development"
    ) return

    const PREFIXES = {
        info:
            "[ --- INFO ------]",
        success:
            "[ --- SUCCESS ---]",
        warn:
            "[ --- WARN ------]",
        error:
            "[ --- ERROR -----]",
        debug:
            "[ --- DEBUG -----]"
    }

    const logger = {
        warn: console.warn,
        error: console.error,
        debug: console.debug
    }[type] || console.log

    const color =
        COLORS[type] || COLORS.reset
    const prefix =
        `${color}${PREFIXES[type]}${COLORS.reset}`
    const timestamp = formatTs()

    logger(
        `[${timestamp}] ${prefix} ${message}`
    )
}

/* ======================
    Validation
====================== */

async function validatePackageJson(path) {
    log("debug", "Package.json: validating")
    if (!(await stat(path)))
        throw new Error(
            `package.json not found at: ${path}`
        )

    try {
        const pkg = JSON.parse(
            await readFile(path, 'utf8')
        )
        const missingFields = []
        if (!pkg.name)
            missingFields.push("name")
        if (!pkg.version)
            missingFields.push("version")
        if (!pkg.bin || typeof pkg.bin !== "object")
            missingFields.push("bin")

        if (missingFields.length > 0)
            throw new Error(
                `Missing required fields: ${missingFields.join(", ")}`
            )

        if (!pkg.bin.minimaz || !pkg.bin.mz)
            throw new Error(
                `bin must include both "minimaz" and "mz"`
            )

        log("debug", "Package.json: valid")
        return pkg
    } catch (error) {
        throw new Error(
            `Validation failed: ${error.message}`,
            { cause: error }
        )
    }
}

/* ======================
    Dist & Templates
====================== */
async function handleDistFolder() {
    log("debug", `Destination folder: Cleaning and re-creating ${destFolderName}`)
    await rm(
        outDir,
        { recursive: true, force: true }
    )

    await mkdir(
        join(outDir, "bin"),
        { recursive: true }
    )
}

async function handleTemplatesFolder() {
    const templatesSrc =
        join(__dirname, "src", "templates")
    const templatesDest =
        join(outDir, "templates")

    if (await stat(templatesSrc)) {
        log(
            "debug",
            `Templates: ./src/templates exists, copying to ${destFolderName}`
        )
        await cp(
            templatesSrc,
            templatesDest,
            { recursive: true }
        )
    } else {
        log(
            "warn",
            `Templates: ./src/templates does not exist`
        )
    }
}

/* ======================
    Build
====================== */

async function build() {
    log("info", "Starting build process...")

    // --- Destination Folder --- /
    await handleDistFolder()

    // --- Package.json --- //
    const pkg =
        await validatePackageJson(pkgPath)

    log(
        "debug",
        `External Dependencies: defining`
    )

    const externalDeps = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
        "node:*"
    ];

    log(
        "debug",
        `External Dependencies: ${externalDeps.join(", ")}`
    )

    log(
        "debug",
        "Package.json: creating minimal version"
    )
    const { bin, ...rest } = pkg
    const removeDist =
        p => p.replace(/dist[\\/]/, "")

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
        dependencies: pkg.dependencies

    }

    log(
        "debug",
        "Package.json: writing on file"
    )

    await writeFile(
        join(outDir, "package.json"),
        JSON.stringify(minimalPkg, null, 2),
        'utf8'
    )

    // --- EsBuild --- //
    log(
        "debug",
        "EsBuild: building"
    )

    await esBuild({
        entryPoints: [join(__dirname, "src/cli/index.ts")],
        bundle: true,
        minify: true,
        platform: "node",
        target: "node18",
        format: "esm",
        outfile: join(outDir, "bin/cli.js"),
        external: externalDeps,
        banner: {
            js: '#!/usr/bin/env node',
        },
        treeShaking: true,
        sourcemap: false,
        legalComments: 'none',
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true,
    })

    // --- Templates --- //
    await handleTemplatesFolder()

    // --- Files to copy --- //
    log(
        "debug",
        "Files to copy: defining"
    )
    const filesToCopy = [
        "LICENSE",
        "README.md"
    ]
    log(
        "debug",
        `Files to copy: ${filesToCopy.join(", ")}`
    )
    for (
        const file
        of filesToCopy
    ) {
        const src =
            join(__dirname, file)
        const dest =
            join(outDir, file)
        if (await stat(src)) {
            log(
                "debug",
                `Files to copy: ${file} exists, copying to ${destFolderName}`
            )
            await cp(src, dest)
        } else {
            log(
                "warn",
                `Files to copy: ${file} does not exists, skipping copy`
            )
        }
    }

    log(
        "success",
        "Build completed successfully!"
    )
}

build().catch(err => {
    log("error", `Build failed: ${err.message}`)
    process.exit(1)
})