import {
    getDirElements
} from "../../shared//fs/index.js"

import {
    loadConfig,
    resolveCurrentPath
} from "../../shared/index.js"

import {
    log
} from "../../shared/logger/index.js"


import type {
    MinimazConfig
} from "../../shared/index.js"

import {
    processExternals,
    reCreateOutDir,
    runDiscovery,
    walkFolder
} from "./core.js"

/**
 * Builds the project according to the Minimaz configuration.
 *
 * Uses a Two-Pass Strategy:
 * 1. Discovery Pass: Populates the Blacklist by scanning for imports
 * 2. Processing Pass: Maps, bundles, transforms and writes files
 */
export async function build(): Promise<void> {
    const config: MinimazConfig =
        await loadConfig()

    const inDirPath: string =
        resolveCurrentPath([config.input.dir])

    const outDirPath: string =
        resolveCurrentPath([config.output.dir])

    // 1. Preparation
    await reCreateOutDir(outDirPath)

    /**
     * Shared State: The "Blacklist"
     * Populated during Discovery Pass to ensure partials/deps
     * are not processed as standalone entry points.
     */
    const ignoredFiles =
        new Set<string>()

    const dirElements: string[] =
        await getDirElements(config.input.dir)

    if (dirElements.length === 0) {
        log.error(
            `Directory ${config.input.dir} is empty`
        )
        return
    }

    /**
     * 2. Phase 1: Discovery Pass
     * Scans the input directory to find all internal dependencies.
     * This ensures the Blacklist is complete before any file is written.
     */
    log.info(
        "Discovery: starting"
    )

    await runDiscovery(
        inDirPath,
        config,
        ignoredFiles,
        config.output.replace ?? {}
    )

    /**
     * 3. Phase 2: Recursive Processing
     * We scan the entire input directory for the second time.
     * The walkFolder function uses the pre-filled ignoredFiles Set.
     */
    log.info(
        "Processing: starting"
    )

    await walkFolder(
        inDirPath,
        outDirPath,
        config,
        ignoredFiles
    )

    /**
     * 4. External Assets
     * Processes resources defined in input.externals.
     * Supports both local file paths and remote URLs.
     */
    const externals: Record<string, string> =
        config.input.externals || {}
    const externalKeys: string[] =
        Object.keys(externals)

    if (externalKeys.length > 0) {
        log.debug(
            `Processing ${externalKeys.length} external resources`
        )

        await processExternals(
            outDirPath,
            externals,
            config,
            ignoredFiles
        )
    }

    log.success(
        `Build completed. Output saved in ${config.output.dir}`
    )
}
