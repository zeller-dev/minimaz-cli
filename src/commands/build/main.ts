import {
    ensureDir
} from "fs-extra"

import {
    join,
    resolve
} from "node:path"

import {
    // --- FUNCTIONS ---
    loadConfig, log, removeOutDir, resolveCurrentPath,

    // --- TYPES ---
    MinimazConfig
} from "../../index.js"

import {
    processExternals, processFolder
} from "./index.js"

/**
 * Builds the project according to the Minimaz configuration.
 *
 * - Cleans and prepares the dist directory
 * - Processes configured source folders
 * - Tracks imports via ignoredFiles to ensure a clean output
 */
export async function build(): Promise<void> {
    const config: MinimazConfig = await loadConfig()
    const outDirPath: string = resolve(resolveCurrentPath(), config.outDir)

    /**
     * Shared State: The "Blacklist"
     * As transformers find @imports or JS dependencies, they add them here.
     * The folder walker checks this Set to avoid processing partials/deps twice.
     */
    const ignoredFiles = new Set<string>()

    // 1. Preparation
    await removeOutDir(outDirPath)
    await ensureDir(outDirPath)

    // 2. Folder Processing
    if (
        !config.folders
        || Object.keys(config.folders).length === 0
    ) {
        log("warn", "No folders defined in config")
    } else {
        for (
            const [from, to]
            of Object.entries(config.folders)
        ) {
            const srcPath: string = resolveCurrentPath([from])
            const destPath: string = join(outDirPath, to)

            log(
                "debug",
                `Building folder: ${from} -> /${to}`
            )

            await processFolder(
                srcPath,
                destPath,
                config,
                ignoredFiles
            )
        }
    }

    /**
     * 3. External Assets
     * We process styles first, then scripts.
     * If an external script imports a file already found in a folder,
     * it will still be bundled correctly, but not duplicated.
     */

    // Process standalone styles (CSS/SCSS)
    if (config.styles?.length) {
        log(
            "debug",
            `Processing ${config.styles.length} external styles...`
        )
        await processExternals(
            outDirPath,
            config.styles,
            config,
            ignoredFiles
        )
    }

    // Process standalone scripts (JS/TS)
    if (config.scripts?.length) {
        log(
            "debug",
            `Processing ${config.scripts.length} external scripts...`
        )
        await processExternals(
            outDirPath,
            config.scripts,
            config,
            ignoredFiles)
    }

    log(
        "success",
        `Build completed. Output saved in ${config.outDir}`
    )
}